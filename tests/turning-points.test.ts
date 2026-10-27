import { describe, it, expect } from "vitest";
import {
  DEFAULT_VIEW,
  emptyFeatures,
  type Item,
  type PlotQuestion,
  type Point,
  type TurningPoint,
} from "../src/types";
import { functionQuestion, functionGame } from "../src/math/functions";
import { gradePlot } from "../src/math/grading";
import { point, sampleFunction } from "../src/math/geometry";
import { cornerSketchQuality } from "../src/math/turningPoints";

function cornerQuestion(): PlotQuestion {
  return {
    mode: "function",
    id: "sharp-test",
    family: "modulus",
    title: "y = 3|x| − 1",
    detail: "",
    view: DEFAULT_VIEW,
    reference: [[point(-2, 5), point(0, -1), point(2, 5)]],
    features: {
      ...emptyFeatures(),
      turns: [{ x: 0, y: -1, kind: "corner", extremum: "minimum" }],
    },
    properties: [],
    explanation: "A sharp minimum.",
  };
}
const curves = (paths: Point[][]): Item[] =>
  paths.map((points, i) => ({ id: `stroke-${i}`, kind: "curve", points }));
const stars = (points: Point[]): Item[] =>
  points.map((p, i) => ({ id: `star-${i}`, kind: "turn", points: [p] }));
const marks = (q: PlotQuestion, items: Item[]) =>
  gradePlot(q, items).breakdown.find((b) => b.label === "Turning points")!
    .score;

describe("automatic sharp turning points", () => {
  it("recognises a sparse V without an intercept or star marker", () => {
    const q = cornerQuestion();
    expect(marks(q, curves(q.reference))).toBe(15);
    expect(
      gradePlot(q, curves(q.reference)).feedback.some((f) =>
        f.includes("recognised automatically"),
      ),
    ).toBe(true);
  });
  it("tolerates freehand jitter and a small vertex displacement", () => {
    const q = cornerQuestion();
    const rough = sampleFunction(
      (x) => 3 * Math.abs(x - 0.025) - 0.94 + 0.025 * Math.sin(20 * x),
      q.view,
    );
    expect(marks(q, curves(rough))).toBeGreaterThanOrEqual(13.5);
  });
  it("handles reversed strokes, lifted brushes, and small gaps at the join", () => {
    const q = cornerQuestion();
    expect(
      marks(q, curves(q.reference.map((path) => [...path].reverse()))),
    ).toBe(15);
    const split = [
      [point(-2, 5), point(-0.02, -0.94)],
      [point(2, 5), point(0.02, -0.94)],
    ];
    expect(marks(q, curves(split))).toBeGreaterThanOrEqual(13.5);
  });
  it("requires both sides and a real change in direction", () => {
    const q = cornerQuestion();
    const wrong: Point[][][] = [
      [[point(0, -1), point(2, 5)]],
      [[point(-2, -1), point(2, -1)]],
      [[point(-2, -5), point(2, 3)]],
      [[point(-2, -5), point(0, -1), point(2, -5)]],
      [
        [point(-2, 5), point(-0.7, 1.1)],
        [point(0.7, 1.1), point(2, 5)],
      ],
      [[point(-2, 7), point(0, 1), point(2, 7)]],
    ];
    for (const paths of wrong) expect(marks(q, curves(paths))).toBe(0);
    expect(marks(q, [])).toBe(0);
    expect(
      marks(q, [{ id: "intercept", kind: "yroot", points: [point(0, -1)] }]),
    ).toBe(0);
  });
  it("keeps optional stars usable without double credit", () => {
    const q = cornerQuestion(),
      drawn = curves(q.reference);
    expect(marks(q, [...drawn, ...stars([point(0, -1)])])).toBe(15);
    expect(
      marks(q, [...drawn, ...stars([point(0, -1), point(0, -1)])]),
    ).toBeLessThan(15);
    expect(marks(q, [...drawn, ...stars([point(4, 4)])])).toBeLessThan(15);
  });
  it("recognises asymmetric piecewise corners across generator parameters", () => {
    for (let i = 0; i < 20; i++)
      for (const family of ["modulus", "piecewise"]) {
        const q = functionQuestion(`corners-${i}`, "Medium", family);
        expect(q.features.turns[0].kind).toBe("corner");
        expect(marks(q, curves(q.reference))).toBe(15);
      }
  });
  it("handles sharp maxima and cusps with explicit metadata", () => {
    const minimum = cornerQuestion();
    const maximum: PlotQuestion = {
      ...minimum,
      reference: minimum.reference.map((path) =>
        path.map((p) => point(p.x, -p.y)),
      ),
      features: {
        ...emptyFeatures(),
        turns: [{ x: 0, y: 1, kind: "corner", extremum: "maximum" }],
      },
    };
    expect(marks(maximum, curves(maximum.reference))).toBe(15);
    const cusp: PlotQuestion = {
      ...minimum,
      reference: sampleFunction(
        (x) => Math.abs(x) ** (2 / 3) - 1,
        minimum.view,
      ),
      features: {
        ...emptyFeatures(),
        turns: [{ x: 0, y: -1, kind: "cusp", extremum: "minimum" }],
      },
    };
    expect(marks(cusp, curves(cusp.reference))).toBe(15);
  });
  it("is invariant under translation and independent coordinate scaling", () => {
    const q = cornerQuestion();
    const change = (p: Point) => point(p.x * 100 + 35, p.y * 0.01 - 8);
    const original = cornerSketchQuality(
      q.reference,
      q.reference,
      q.features.turns[0],
      q.view,
    );
    const movedReference = q.reference.map((path) => path.map(change));
    const movedFeature: TurningPoint = {
      ...q.features.turns[0],
      ...change(q.features.turns[0]),
    };
    const movedView = {
      xmin: q.view.xmin * 100 + 35,
      xmax: q.view.xmax * 100 + 35,
      ymin: q.view.ymin * 0.01 - 8,
      ymax: q.view.ymax * 0.01 - 8,
    };
    expect(
      cornerSketchQuality(
        movedReference,
        movedReference,
        movedFeature,
        movedView,
      ),
    ).toBeCloseTo(original, 10);
  });
});

describe("smooth turning point markers", () => {
  it("still requires stars for a smooth parabola, regardless of sketch accuracy", () => {
    const q = functionQuestion("smooth", "Easy", "quadratic");
    expect(q.features.turns[0].kind).toBe("smooth");
    const drawn = curves(q.reference);
    expect(marks(q, drawn)).toBe(0);
    expect(marks(q, [...drawn, ...stars(q.features.turns)])).toBe(15);
    expect(
      gradePlot(q, drawn).feedback.some((f) =>
        f.includes("Smooth turning points need purple star"),
      ),
    ).toBe(true);
  });
  it("combines automatic corners with required smooth stars in the same question", () => {
    const q: PlotQuestion = {
      ...cornerQuestion(),
      view: { xmin: -2, xmax: 2, ymin: -2, ymax: 1 },
      reference: sampleFunction((x) => Math.abs(x) - x * x, {
        xmin: -2,
        xmax: 2,
        ymin: -2,
        ymax: 1,
      }),
      features: {
        ...emptyFeatures(),
        turns: [
          { x: 0, y: 0, kind: "corner", extremum: "minimum" },
          { x: -0.5, y: 0.25, kind: "smooth", extremum: "maximum" },
          { x: 0.5, y: 0.25, kind: "smooth", extremum: "maximum" },
        ],
      },
    };
    expect(marks(q, curves(q.reference))).toBe(5);
    expect(
      marks(q, [...curves(q.reference), ...stars(q.features.turns.slice(1))]),
    ).toBe(15);
  });
  it("does not auto-credit smooth points or stationary inflections", () => {
    for (const q of functionGame("smooth-family", "Hard")) {
      expect(q.features.turns.every((t) => t.kind === "smooth")).toBe(true);
      if (q.features.turns.length)
        expect(marks(q, curves(q.reference))).toBe(0);
    }
    const q = functionQuestion("inflection", "Expert", "stationary");
    expect(q.features.turns.some((t) => t.x === 0)).toBe(false);
  });
});
