import type {
  Breakdown,
  Grade,
  Item,
  Network,
  NetworkQuestion,
  PlotQuestion,
  Point,
  View,
} from "../types";
import {
  compareCurves,
  distance,
  inside,
  itemPath,
  normalizedDistance,
  point,
  polygonContains,
} from "./geometry";
import {
  bipartite,
  components,
  degreeSequence,
  edgeKey,
  isSimple,
} from "./networks";
import { cornerSketchQuality, isSketchTurningPoint } from "./turningPoints";

export const TOLERANCE = { curve: 0.025, marker: 0.045 };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
function matchPointQualities(actual: Point[], expected: Point[], view: View) {
  const candidates = actual
    .flatMap((p, i) =>
      expected.map((q, j) => ({ i, j, d: normalizedDistance(p, q, view) })),
    )
    .sort((a, b) => a.d - b.d);
  const usedA = new Set<number>(),
    usedB = new Set<number>();
  const scores = expected.map(() => 0);
  for (const c of candidates) {
    if (c.d < TOLERANCE.marker && !usedA.has(c.i) && !usedB.has(c.j)) {
      usedA.add(c.i);
      usedB.add(c.j);
      scores[c.j] = Math.max(0, 1 - (c.d / TOLERANCE.marker) ** 2);
    }
  }
  return { scores, unmatched: actual.length - usedA.size };
}
export function matchPoints(actual: Point[], expected: Point[], view: View) {
  if (!expected.length) return actual.length ? 0 : 1;
  const { scores } = matchPointQualities(actual, expected, view);
  return (
    scores.reduce((sum, score) => sum + score, 0) /
    Math.max(actual.length, expected.length)
  );
}

function assessTurningPoints(
  q: PlotQuestion,
  paths: Point[][],
  markers: Point[],
) {
  const turns = q.features.turns;
  const manual = matchPointQualities(markers, turns, q.view);
  const automatic = turns.map((t) =>
    cornerSketchQuality(paths, q.reference, t, q.view),
  );
  const scores = turns.map((_, i) => Math.max(manual.scores[i], automatic[i]));
  const sharp = turns.filter(isSketchTurningPoint);
  const smooth = turns.filter((t) => !isSketchTurningPoint(t));
  const detected = turns.filter(
    (t, i) => isSketchTurningPoint(t) && automatic[i] > 0,
  );
  const missingSharp = turns.filter(
    (t, i) => isSketchTurningPoint(t) && scores[i] === 0,
  );
  const missingSmooth = turns.filter(
    (t, i) => !isSketchTurningPoint(t) && manual.scores[i] === 0,
  );
  const messages: string[] = [];
  if (sharp.length) {
    messages.push(
      `Corners and cusps are read automatically from the sketch; a star is optional. Expected: ${formatPoints(sharp)}.`,
    );
    if (detected.length)
      messages.push(`Recognised from your sketch: ${formatPoints(detected)}.`);
    if (missingSharp.length)
      messages.push(
        `Sharp turning points not recognised: ${formatPoints(missingSharp)}. Draw both sides meeting near each vertex and turning in the correct direction.`,
      );
  }
  if (smooth.length) {
    messages.push(
      `Smooth turning points still require purple star markers: ${formatPoints(smooth)}.`,
    );
    if (missingSmooth.length)
      messages.push(
        `Missing or misplaced stars: ${formatPoints(missingSmooth)}.`,
      );
  }
  if (manual.unmatched)
    messages.push(
      `${manual.unmatched} extra or misplaced star marker(s) reduced this score.`,
    );
  const feedback = [
    ...(detected.length
      ? [
          `Sharp turning points recognised automatically from your sketch: ${formatPoints(detected)}.`,
        ]
      : []),
    ...(missingSharp.length
      ? [
          `The sketch did not establish the sharp turning point(s) at ${formatPoints(missingSharp)}. Draw both sides of each corner or cusp; no star is required.`,
        ]
      : []),
    ...(missingSmooth.length
      ? [
          `Smooth turning points need purple star markers. Mark ${formatPoints(missingSmooth)} with the Turning point tool.`,
        ]
      : []),
  ];
  return {
    quality: turns.length
      ? scores.reduce((sum, score) => sum + score, 0) /
        (turns.length + manual.unmatched)
      : 0,
    message: messages.join(" "),
    feedback,
  };
}
const aliases: Record<string, string[]> = {
  even: [
    "even",
    "even function",
    "symmetric about the y axis",
    "symmetric about y axis",
  ],
  odd: ["odd", "odd function", "symmetric about the origin", "origin symmetry"],
  continuous: [
    "continuous",
    "continuous on its domain",
    "continuous everywhere",
  ],
  differentiable: [
    "differentiable",
    "differentiable on its domain",
    "differentiable everywhere",
  ],
  increasing: ["increasing", "strictly increasing", "monotonically increasing"],
  decreasing: ["decreasing", "strictly decreasing", "monotonically decreasing"],
  injective: ["injective", "one to one", "one-to-one"],
  periodic: ["periodic"],
  bounded: ["bounded"],
  "bounded below": ["bounded below", "bounded from below", "has a lower bound"],
  "bounded above": [
    "bounded above",
    "bounded from above",
    "has an upper bound",
  ],
  unbounded: ["unbounded", "not bounded"],
  "unbounded below": [
    "unbounded below",
    "unbounded from below",
    "no lower bound",
    "has no lower bound",
    "not bounded below",
    "not bounded from below",
  ],
  "unbounded above": [
    "unbounded above",
    "unbounded from above",
    "no upper bound",
    "has no upper bound",
    "not bounded above",
    "not bounded from above",
  ],
  positive: ["positive", "strictly positive", "y > 0", "range: y > 0"],
  nonnegative: ["nonnegative", "non negative", "y >= 0", "range: y >= 0"],
  "inflection at zero": [
    "inflection at zero",
    "inflection point at x = 0",
    "inflection at x = 0",
  ],
  "x-axis symmetry": ["symmetric about the x axis"],
  "y-axis symmetry": ["y axis symmetry"],
};
export function evaluateProperties(text: string, q: PlotQuestion) {
  const seen = new Set<string>();
  const claims: NonNullable<Grade["claims"]> = [];
  let correct = 0,
    wrong = 0;
  for (const raw of text
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    let s = raw
      .toLowerCase()
      .replace(/[.]+$/, "")
      .replace(/π/g, "pi")
      .replace(/≥/g, ">=")
      .replace(/−/g, "-")
      .replace(/y-axis/g, "y axis")
      .replace(/x-axis/g, "x axis")
      .replace(/\s+/g, " ");
    let negative = false;
    if (s.startsWith("not ")) {
      negative = true;
      s = s.slice(4);
    }
    let key = Object.entries(aliases).find(([, values]) =>
      values.includes(s),
    )?.[0];
    const period = s.match(
      /^(?:periodic with )?period\s*(?:=|:|of)?\s*(\d+(?:\.\d+)?)?\s*(pi)?\s*(?:\/\s*(\d+))?$/,
    );
    let periodValue: number | undefined;
    if (period) {
      periodValue =
        (Number(period[1] || 1) * (period[2] ? Math.PI : 1)) /
        Number(period[3] || 1);
      key = "period";
    }
    if (!key) {
      claims.push({ text: raw, status: "unverified" });
      continue;
    }
    // Negated bounds describe the same fact as their positive counterpart.
    // Deduplicate equivalent claims, but still mark contradictory claims.
    if (key.startsWith("unbounded")) {
      key = key.replace("unbounded", "bounded");
      negative = !negative;
    }
    const identity = `${key}:${negative ? "negative" : "positive"}`;
    if (seen.has(identity)) {
      claims.push({ text: raw, status: "duplicate" });
      continue;
    }
    seen.add(identity);
    let trueKnown =
      q.properties.includes(key) ||
      (key === "odd" && q.properties.includes("origin symmetry")) ||
      (key === "even" && q.properties.includes("y-axis symmetry"));
    let falseKnown = q.falseProperties?.includes(key) || false;
    // Boundedness implies both directional bounds. Its negation alone does
    // not establish which direction is unbounded.
    if (key === "bounded above" || key === "bounded below") {
      trueKnown ||= q.properties.includes("bounded");
    }
    if (key === "bounded") {
      trueKnown ||=
        q.properties.includes("bounded above") &&
        q.properties.includes("bounded below");
      falseKnown ||=
        q.falseProperties?.includes("bounded above") ||
        q.falseProperties?.includes("bounded below") ||
        false;
    }
    if (key === "period") {
      const p = q.properties.find((p) => p.startsWith("period:"));
      if (p) {
        trueKnown = Math.abs(Number(p.split(":")[1]) - periodValue!) < 1e-5;
        falseKnown = !trueKnown;
      }
    }
    if (
      s.endsWith("everywhere") &&
      [
        "reciprocal",
        "rational",
        "logarithm",
        "hole",
        "logratio",
        "power",
        "singular",
        "oscillation",
        "hyperbola",
        "rationalpair",
      ].includes(q.family)
    ) {
      trueKnown = false;
      falseKnown = true;
    }
    if (negative) [trueKnown, falseKnown] = [falseKnown, trueKnown];
    const status = trueKnown
      ? "correct"
      : falseKnown
        ? "incorrect"
        : "unverified";
    if (status === "correct") correct++;
    if (status === "incorrect") wrong++;
    claims.push({ text: raw, status });
  }
  return {
    claims,
    quality: clamp(
      (correct - wrong) /
        Math.min(
          2,
          new Set(q.properties.filter((p) => !p.startsWith("period:"))).size ||
            1,
        ),
    ),
  };
}
function finalGrade(
  breakdown: Breakdown[],
  feedback: string[],
  claims?: Grade["claims"],
): Grade {
  return {
    score: Math.max(
      0,
      Math.min(100, Math.round(breakdown.reduce((a, b) => a + b.score, 0))),
    ),
    breakdown,
    feedback,
    claims,
  };
}
export function gradePlot(
  q: PlotQuestion,
  items: Item[],
  properties = "",
): Grade {
  if (q.practiceOnly)
    return {
      score: 0,
      breakdown: [],
      feedback: [
        "Unmarked practice: no reference solution or automatic score is available.",
      ],
    };
  const curveItems = items.filter((i) =>
    ["curve", "line", "ray", "circle"].includes(i.kind),
  );
  const paths = curveItems.map((i) => itemPath(i, q.view));
  const geometry = compareCurves(paths, q.reference, q.view, TOLERANCE.curve);
  const breakdown: Breakdown[] = [];
  const add = (label: string, quality: number, max: number, message: string) =>
    breakdown.push({
      label,
      score: Math.round(clamp(quality) * max * 10) / 10,
      max,
      message,
    });
  if (q.mode === "function") {
    const props = evaluateProperties(properties, q);
    const intercepts = q.features.xroots.length + q.features.yroots.length;
    const markers = (kind: Item["kind"]) =>
      items.filter((i) => i.kind === kind).map((i) => i.points[0]);
    const turningPoints = assessTurningPoints(q, paths, markers("turn"));
    const ends =
      (q.features.open?.length || 0) + (q.features.closed?.length || 0);
    let curveMax = q.curveOnly ? 100 : 40;
    const allocations: {
      label: string;
      quality: number;
      max: number;
      message: string;
    }[] = [];
    if (!q.curveOnly) {
      if (intercepts) {
        const quality =
          (matchPoints(markers("xroot"), q.features.xroots, q.view) *
            q.features.xroots.length +
            matchPoints(markers("yroot"), q.features.yroots, q.view) *
              q.features.yroots.length) /
          intercepts;
        allocations.push({
          label: "Intercepts",
          quality,
          max: 15,
          message: `Expected x-intercepts: ${formatPoints(q.features.xroots)}; y-intercepts: ${formatPoints(q.features.yroots)}.`,
        });
      } else curveMax += 15;
      if (q.features.turns.length)
        allocations.push({
          label: "Turning points",
          quality: turningPoints.quality,
          max: 15,
          message: turningPoints.message,
        });
      else curveMax += 15;
      if (q.features.asymptotes.length)
        allocations.push({
          label: "Asymptotes",
          quality: compareCurves(
            items.filter((i) => i.kind === "asymptote").map((i) => i.points),
            q.features.asymptotes,
            q.view,
            0.03,
          ),
          max: 15,
          message: `Expected ${q.features.asymptotes.length} asymptote${q.features.asymptotes.length === 1 ? "" : "s"}; compare the dashed reference lines.`,
        });
      else curveMax += 15;
      if (q.properties.length)
        allocations.push({
          label: "Properties",
          quality: props.quality,
          max: 15,
          message:
            "Two distinct verified properties earn full credit. Incorrect recognised claims cancel correct claims; unverified text is not scored.",
        });
      else curveMax += 15;
      if (ends) {
        curveMax -= 10;
        allocations.push({
          label: "Endpoints / holes",
          quality:
            ((q.features.open?.length || 0) *
              matchPoints(markers("open"), q.features.open || [], q.view) +
              (q.features.closed?.length || 0) *
                matchPoints(
                  markers("closed"),
                  q.features.closed || [],
                  q.view,
                )) /
            ends,
          max: 10,
          message: `Open: ${formatPoints(q.features.open || [])}. Closed: ${formatPoints(q.features.closed || [])}.`,
        });
      }
    }
    add(
      "Curve accuracy",
      geometry,
      curveMax,
      "Bidirectional distance checks both how closely your strokes follow the reference and how much of the reference you covered. The assessment window stays fixed when you pan or zoom.",
    );
    for (const a of allocations) add(a.label, a.quality, a.max, a.message);
    if (!q.curveOnly) {
      const extras =
        (q.features.xroots.length ? 0 : markers("xroot").length) +
        (q.features.yroots.length ? 0 : markers("yroot").length) +
        (q.features.turns.length ? 0 : markers("turn").length) +
        (q.features.asymptotes.length
          ? 0
          : items.filter((i) => i.kind === "asymptote").length) +
        (q.features.open?.length ? 0 : markers("open").length) +
        (q.features.closed?.length ? 0 : markers("closed").length);
      if (extras)
        breakdown.push({
          label: "Extra features",
          score: -Math.min(20, extras * 3),
          max: 0,
          message:
            "Markers for nonexistent features lose 3 points each (up to 20).",
        });
    }
    return finalGrade(
      breakdown,
      [
        geometry < 0.65
          ? "Check missing branches, curve position, and any strokes joining across discontinuities."
          : geometry < 0.9
            ? "Your overall shape is close. Refine the curve near the highlighted features."
            : "Your curve follows the reference closely.",
        q.explanation,
        ...(!q.curveOnly ? turningPoints.feedback : []),
      ],
      props.claims,
    );
  }
  const open = q.features.open || [],
    closed = q.features.closed || [];
  if (!q.reference.length && closed.length) {
    add(
      "Point position",
      matchPoints(
        items
          .filter((i) => ["point", "closed"].includes(i.kind))
          .map((i) => i.points[0]),
        closed,
        q.view,
      ),
      100,
      `Expected point: ${formatPoints(closed)}.`,
    );
    return finalGrade(breakdown, [q.explanation]);
  }
  const regions = items.filter((i) => i.kind === "region" || i.kind === "disk");
  let shading = 0;
  if (q.region) {
    let intersection = 0,
      union = 0;
    for (let ix = 0; ix < 80; ix++)
      for (let iy = 0; iy < 80; iy++) {
        const p = point(
          q.view.xmin + ((ix + 0.5) / 80) * (q.view.xmax - q.view.xmin),
          q.view.ymin + ((iy + 0.5) / 80) * (q.view.ymax - q.view.ymin),
        );
        const expected = q.region(p),
          actual = regions.some((i) =>
            i.kind === "disk"
              ? i.points.length > 1 &&
                distance(p, i.points[0]) <= distance(i.points[0], i.points[1])
              : polygonContains(p, i.points),
          );
        if (expected && actual) intersection++;
        if (expected || actual) union++;
      }
    shading = union ? intersection / union : 0;
  }
  add(
    "Locus geometry",
    geometry,
    q.region ? 35 : open.length ? 75 : 90,
    "Checks the mathematical position, extent and shape of every boundary or locus.",
  );
  if (q.region)
    add(
      "Region shading",
      shading,
      open.length ? 40 : 50,
      "Intersection-over-union of shaded sets over the assessment window. Cover the entire visible region; shading alone does not draw its boundary.",
    );
  if (q.region || !open.length)
    add(
      "Boundary style",
      curveItems.length
        ? curveItems.filter((i) => !!i.dashed === !!q.boundaryDashed).length /
            curveItems.length
        : 0,
      q.region ? 15 : open.length ? 0 : 10,
      q.boundaryDashed
        ? "The boundary is excluded: draw it dashed."
        : "The boundary belongs to the locus: draw it solid.",
    );
  if (open.length)
    add(
      "Excluded points",
      matchPoints(
        items.filter((i) => i.kind === "open").map((i) => i.points[0]),
        open,
        q.view,
      ),
      q.region ? 10 : 25,
      `Use open markers at ${formatPoints(open)}.`,
    );
  const unexpected = items
    .filter((i) => ["open", "closed", "point"].includes(i.kind))
    .filter(
      (i) =>
        !(i.kind === "open" ? open : closed).some(
          (p) => normalizedDistance(p, i.points[0], q.view) < TOLERANCE.marker,
        ),
    ).length;
  if (unexpected)
    breakdown.push({
      label: "Incorrect point markers",
      score: -Math.min(25, unexpected * 10),
      max: 0,
      message:
        "Remove markers that are not required or that include an excluded point.",
    });
  return finalGrade(breakdown, [
    q.explanation,
    geometry < 0.7
      ? "Check the position and extent of the locus against the reference."
      : "The locus geometry is close to the reference.",
    ...(q.region && shading < 0.7
      ? [
          "Check which side of the boundary is shaded and cover the full assessment window.",
        ]
      : []),
  ]);
}
export function formatPoints(ps: Point[]) {
  return ps.length
    ? ps.map((p) => `(${+p.x.toFixed(3)}, ${+p.y.toFixed(3)})`).join(", ")
    : "none";
}
export function gradeNetwork(q: NetworkQuestion, g: Network): Grade {
  if (!g.vertices.length)
    return finalGrade(
      [
        {
          label: "Construction",
          score: 0,
          max: 100,
          message: "Add the required vertices and edges before submitting.",
        },
      ],
      ["No graph was constructed."],
    );
  const breakdown: Breakdown[] = [];
  const add = (label: string, quality: number, max: number, message: string) =>
    breakdown.push({
      label,
      score: Math.round(clamp(quality) * max),
      max,
      message,
    });
  const n = q.answer.vertices.length,
    connected = components(g) === 1;
  const vertexQuality = 1 - Math.abs(g.vertices.length - n) / n;
  if (!isSimple(g))
    return finalGrade(
      [
        {
          label: "Valid simple graph",
          score: 0,
          max: 100,
          message:
            "Loops, duplicate edges, or invalid vertex references are not permitted.",
        },
      ],
      ["Construct a simple undirected graph."],
    );
  if (q.constraint === "labelled") {
    const labels = g.vertices.map((v) => v.label),
      expectedLabels = q.answer.vertices.map((v) => v.label);
    const labelMatches = expectedLabels.filter(
      (l) => labels.filter((x) => x === l).length === 1,
    ).length;
    add(
      "Vertex labels",
      labelMatches / Math.max(n, g.vertices.length),
      20,
      `Required labels: ${expectedLabels.join(", ")}.`,
    );
    const keys = (net: Network) =>
      net.edges.map(([a, b]) =>
        edgeKey(
          net.vertices.find((v) => v.id === a)!.label,
          net.vertices.find((v) => v.id === b)!.label,
        ),
      );
    const expected = keys(q.answer),
      actual = keys(g),
      matches = actual.filter((e) => expected.includes(e)).length;
    const uniqueLabels = new Set(labels).size === labels.length;
    add(
      "Adjacency",
      uniqueLabels
        ? expected.length + actual.length
          ? (2 * matches) / (expected.length + actual.length)
          : 1
        : 0,
      80,
      `${matches} correct edges; ${actual.length - matches} extra; ${expected.length - matches} missing.`,
    );
  } else {
    add(
      "Vertex count",
      vertexQuality,
      20,
      `${g.vertices.length} of ${n} required vertices.`,
    );
    const edgeQuality =
      1 -
      Math.abs(g.edges.length - q.answer.edges.length) /
        Math.max(1, q.answer.edges.length);
    if (q.constraint === "degrees" || q.constraint === "regular") {
      const actual = degreeSequence(g),
        expected = q.degrees!;
      let error = 0;
      for (let i = 0; i < Math.max(actual.length, expected.length); i++)
        error += Math.abs((actual[i] || 0) - (expected[i] || 0));
      add(
        "Degree sequence",
        1 -
          error /
            Math.max(
              1,
              expected.reduce((a, b) => a + b, 0),
            ),
        q.constraint === "regular" ? 50 : 80,
        `Your sequence: (${actual.join(", ")}). Target: (${expected.join(", ")}).`,
      );
      if (q.constraint === "regular")
        add(
          "Connectivity",
          connected ? 1 : 0,
          30,
          `Your graph has ${components(g)} connected component(s).`,
        );
    } else if (q.constraint === "bipartite") {
      add(
        "Edge count",
        edgeQuality,
        25,
        `${g.edges.length} of ${q.answer.edges.length} edges.`,
      );
      add(
        "Connectivity",
        connected ? 1 : 0,
        25,
        `Your graph has ${components(g)} connected component(s).`,
      );
      add(
        "Bipartite",
        bipartite(g) ? 1 : 0,
        30,
        "A bipartite graph has a two-colouring with no edge joining equal colours.",
      );
    } else if (q.constraint === "complete") {
      add(
        "All pairs joined",
        g.vertices.length === n ? g.edges.length / ((n * (n - 1)) / 2) : 0,
        80,
        `A complete graph on ${n} vertices has ${(n * (n - 1)) / 2} edges.`,
      );
    } else {
      add(
        "Connectivity",
        connected ? 1 : 0,
        40,
        `Your graph has ${components(g)} connected component(s).`,
      );
      add(
        "Edge count",
        edgeQuality,
        40,
        q.constraint === "tree"
          ? "A connected graph is a tree precisely when E = V − 1."
          : "A connected graph has exactly one cycle precisely when E = V.",
      );
    }
  }
  return finalGrade(breakdown, [q.explanation]);
}
export function visibleFeatures(q: PlotQuestion) {
  return [
    ...q.features.xroots,
    ...q.features.yroots,
    ...q.features.turns,
  ].filter((p) => inside(p, q.view));
}
