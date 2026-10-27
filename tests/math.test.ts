import { describe, it, expect } from "vitest";
import { functionQuestion, functionGame } from "../src/math/functions";
import { customFunction } from "../src/math/customFunction";
import {
  complexQuestion,
  complexGame,
  customComplex,
} from "../src/math/complex";
import {
  networkQuestion,
  networkGame,
  customNetwork,
  network,
  components,
  bipartite,
  degreeSequence,
  isSimple,
} from "../src/math/networks";
import {
  compareCurves,
  toMath,
  toScreen,
  point,
  sampleFunction,
  inside,
  polygonContains,
  normalizedDistance,
} from "../src/math/geometry";
import {
  gradePlot,
  gradeNetwork,
  evaluateProperties,
  matchPoints,
} from "../src/math/grading";
import { readHistory, saveHistory } from "../src/storage";
import {
  DEFAULT_VIEW,
  type Difficulty,
  type Item,
  type PlotQuestion,
  type HistoryEntry,
} from "../src/types";
const levels: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const perfect = (q: PlotQuestion): Item[] => [
  ...q.reference.map((p, i) => ({
    id: `c${i}`,
    kind: "curve" as const,
    points: p,
    dashed: !!q.boundaryDashed,
  })),
  ...q.features.asymptotes.map((p, i) => ({
    id: `a${i}`,
    kind: "asymptote" as const,
    points: p,
  })),
  ...(["xroots", "yroots", "turns", "open", "closed"] as const).flatMap((key) =>
    (q.features[key] || []).map((p, i) => ({
      id: `${key}${i}`,
      kind: (
        {
          xroots: "xroot",
          yroots: "yroot",
          turns: "turn",
          open: "open",
          closed: "closed",
        } as const
      )[key],
      points: [p],
    })),
  ),
];
function propertyText(q: PlotQuestion) {
  return q.properties
    .filter((p) => !p.startsWith("period:"))
    .map((p) =>
      p === "origin symmetry"
        ? "symmetric about the origin"
        : p === "y-axis symmetry"
          ? "symmetric about the y axis"
          : p === "x-axis symmetry"
            ? "symmetric about the x axis"
            : p,
    )
    .join("; ");
}
describe("seeded generators", () => {
  for (const level of levels) {
    it(`generates varied valid ${level} questions with repeatable seeds`, () => {
      for (let i = 0; i < 8; i++) {
        const fs = functionGame(`seed-${i}`, level);
        expect(fs).toEqual(functionGame(`seed-${i}`, level));
        expect(fs).toHaveLength(5);
        expect(new Set(fs.map((q) => q.family)).size).toBe(5);
        for (const q of fs) {
          expect(q.reference.length).toBeGreaterThan(0);
          expect(
            q.reference
              .flat()
              .every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
          ).toBe(true);
          expect(q.reference.flat().some((p) => inside(p, q.view))).toBe(true);
          for (const p of [
            ...q.features.xroots,
            ...q.features.yroots,
            ...q.features.turns,
          ])
            expect(
              q.reference
                .flat()
                .some((s) => normalizedDistance(p, s, q.view) < 0.025),
            ).toBe(true);
        }
        for (const q of networkGame(`seed-${i}`, level)) {
          expect(isSimple(q.answer)).toBe(true);
          expect(gradeNetwork(q, q.answer).score).toBe(100);
        }
        for (const q of complexGame(`seed-${i}`, level)) {
          expect(
            q.reference.length + (q.features.closed?.length || 0),
          ).toBeGreaterThan(0);
        }
      }
    });
  }
  it("changes parameters between different seeds", () => {
    const titles = Array.from(
      { length: 30 },
      (_, i) => functionQuestion(`p${i}`, "Easy", "quadratic").title,
    );
    expect(new Set(titles).size).toBeGreaterThan(15);
  });
});
describe("geometry and analytic metadata", () => {
  it("round trips independent coordinate scales", () => {
    const view = { xmin: -17, xmax: 2, ymin: -0.1, ymax: 500 };
    for (const p of [point(0, 0), point(-5, 200), point(2, 500)]) {
      const result = toMath(toScreen(p, view, 840, 520), view, 840, 520);
      expect(result.x).toBeCloseTo(p.x, 10);
      expect(result.y).toBeCloseTo(p.y, 10);
    }
  });
  it("splits reciprocal branches at the singularity", () => {
    const q = functionQuestion("test", "Easy", "reciprocal");
    for (const branch of q.reference)
      expect(branch.some((p) => p.x < 0) && branch.some((p) => p.x > 0)).toBe(
        false,
      );
    expect(q.features.asymptotes).toHaveLength(2);
  });
  it("does not plot logarithms outside their domains", () => {
    const q = functionQuestion("test", "Hard", "logratio");
    expect(q.reference.flat().every((p) => p.x > 0)).toBe(true);
    expect(q.features.turns[0].x).toBeCloseTo(Math.E);
    expect(q.features.xroots[0].x).toBe(1);
  });
  it("distinguishes stationary inflections from turning points", () => {
    const q = functionQuestion("test", "Expert", "stationary");
    expect(q.features.turns).toHaveLength(2);
    expect(q.features.turns.some((p) => p.x === 0)).toBe(false);
    expect(q.properties).toContain("inflection at zero");
  });
  it("implicit ellipse satisfies its equation", () => {
    const q = functionQuestion("ellipse", "Hard", "ellipse");
    const constant = q.features.xroots[0].x ** 2;
    for (const p of q.reference[0])
      expect(p.x * p.x + p.x * p.y + p.y * p.y).toBeCloseTo(constant, 8);
  });
  it("tests polygon membership geometrically", () => {
    const poly = [point(0, 0), point(2, 0), point(2, 2), point(0, 2)];
    expect(polygonContains(point(1, 1), poly)).toBe(true);
    expect(polygonContains(point(3, 1), poly)).toBe(false);
  });
  it("respects holes and open domain limits", () => {
    expect(
      functionQuestion("test", "Medium", "hole").features.open,
    ).toHaveLength(1);
    expect(
      functionQuestion("test", "Expert", "power").features.open?.[0].x,
    ).toBe(0);
  });
});
describe("interpretable grading", () => {
  it("clips long construction-tool lines before sampling", () => {
    expect(
      compareCurves(
        [[point(1, -1000), point(1, 1000)]],
        [[point(1, -5), point(1, 5)]],
        DEFAULT_VIEW,
      ),
    ).toBeCloseTo(1, 8);
  });
  it("awards full marks to analytic reference solutions across all function families", () => {
    for (const level of levels) {
      for (const q of functionGame("perfect", level)) {
        const grade = gradePlot(q, perfect(q), propertyText(q));
        expect(grade.score, `${q.family}: ${JSON.stringify(grade)}`).toBe(100);
        expect(grade.breakdown.reduce((s, b) => s + b.max, 0)).toBe(100);
      }
    }
  }, 30000);
  it("gives high marks to small freehand errors and rejects wrong curves", () => {
    const path = sampleFunction((x) => x * x, DEFAULT_VIEW);
    expect(compareCurves(path, path, DEFAULT_VIEW)).toBeCloseTo(1);
    expect(
      compareCurves(
        path.map((ps) => ps.map((p) => point(p.x, p.y + 0.1))),
        path,
        DEFAULT_VIEW,
      ),
    ).toBeGreaterThan(0.9);
    expect(
      compareCurves(
        sampleFunction((x) => -x * x - 2, DEFAULT_VIEW),
        path,
        DEFAULT_VIEW,
      ),
    ).toBeLessThan(0.15);
    expect(compareCurves([], path, DEFAULT_VIEW)).toBe(0);
  });
  it("penalises missing branches and extra strokes", () => {
    const q = functionQuestion("test", "Expert", "singular");
    const full = gradePlot(q, perfect(q), propertyText(q)).score;
    const half = gradePlot(
      q,
      perfect(q).filter(
        (i) => i.kind !== "curve" || i.points.some((p) => p.x > 0),
      ),
      propertyText(q),
    ).score;
    expect(full).toBe(100);
    expect(half).toBeLessThan(full - 10);
  });
  it("does not award points for blank answers or nonexistent features", () => {
    const q = functionQuestion("test", "Easy", "linear");
    expect(gradePlot(q, []).score).toBe(0);
    const answer = perfect(q);
    const before = gradePlot(q, answer, propertyText(q)).score;
    const after = gradePlot(
      q,
      [...answer, { id: "fake", kind: "turn", points: [point(2, 2)] }],
      propertyText(q),
    ).score;
    expect(after).toBeLessThan(before);
  });
  it("matches markers one-to-one and penalises extras", () => {
    expect(
      matchPoints([point(1, 0), point(1, 0)], [point(1, 0)], DEFAULT_VIEW),
    ).toBe(0.5);
    expect(
      matchPoints([point(1, 0)], [point(1, 0), point(-1, 0)], DEFAULT_VIEW),
    ).toBe(0.5);
  });
  it("recognises synonyms without rewarding duplicates or verbosity", () => {
    const q = functionQuestion("test", "Easy", "quadratic");
    const p = evaluateProperties(
      "bounded below; bounded below; this is a lovely graph; continuous; injective",
      q,
    );
    expect(p.claims.map((c) => c.status)).toEqual([
      "correct",
      "duplicate",
      "unverified",
      "correct",
      "incorrect",
    ]);
    expect(p.quality).toBe(0.5);
  });
  it("awards the screenshot's even and unbounded-above claims full property credit", () => {
    const q: PlotQuestion = {
      ...functionQuestion("screenshot", "Medium", "modulus"),
      title: "y = 3|x| − 1",
      reference: sampleFunction((x) => 3 * Math.abs(x) - 1, DEFAULT_VIEW),
      features: {
        xroots: [point(-1 / 3, 0), point(1 / 3, 0)],
        yroots: [point(0, -1)],
        turns: [{ x: 0, y: -1, kind: "corner", extremum: "minimum" }],
        asymptotes: [],
      },
      properties: ["continuous", "bounded below", "even"],
    };
    const properties = "even function; unbounded above";
    expect(
      evaluateProperties(properties, q).claims.map((c) => c.status),
    ).toEqual(["correct", "correct"]);
    const withoutStar = perfect(q).filter((item) => item.kind !== "turn");
    const grade = gradePlot(q, withoutStar, properties);
    expect(grade.breakdown.find((b) => b.label === "Properties")?.score).toBe(
      15,
    );
    expect(
      grade.breakdown.find((b) => b.label === "Turning points")?.score,
    ).toBe(15);
    expect(
      grade.breakdown.find((b) => b.label === "Turning points")?.message,
    ).toContain("Recognised from your sketch");
    expect(grade.score).toBe(100);
    expect(gradePlot(q, perfect(q), properties).score).toBe(100);
  });
  it("accepts equivalent descriptions of unboundedness once", () => {
    const q = functionQuestion("bounds", "Medium", "modulus");
    const result = evaluateProperties(
      "unbounded above; not bounded above; has no upper bound; unbounded from above; not bounded from above",
      q,
    );
    expect(result.claims.map((c) => c.status)).toEqual([
      "correct",
      "duplicate",
      "duplicate",
      "duplicate",
      "duplicate",
    ]);
    expect(result.quality).toBe(0.5);
  });
  it("does not hide a contradictory property as a duplicate", () => {
    const q = functionQuestion("bounds", "Medium", "modulus");
    const result = evaluateProperties("unbounded above; bounded above", q);
    expect(result.claims.map((c) => c.status)).toEqual([
      "correct",
      "incorrect",
    ]);
    expect(result.quality).toBe(0);
    expect(
      evaluateProperties("bounded above; unbounded above", q).quality,
    ).toBe(0);
  });
  it("checks upper and lower bounds over the full domain", () => {
    const parabola = functionQuestion("bounds", "Easy", "quadratic");
    expect(
      evaluateProperties(
        "unbounded above; unbounded below",
        parabola,
      ).claims.map((c) => c.status),
    ).toEqual(["correct", "incorrect"]);
    const cubic = functionQuestion("bounds", "Easy", "cubic");
    expect(
      evaluateProperties("no upper bound; has no lower bound", cubic).quality,
    ).toBe(1);
    const logarithmic = functionQuestion("bounds", "Hard", "logratio");
    expect(
      evaluateProperties("bounded above; unbounded below", logarithmic).quality,
    ).toBe(1);
    const ellipse = functionQuestion("bounds", "Hard", "ellipse");
    expect(
      evaluateProperties(
        "unbounded above; unbounded below",
        ellipse,
      ).claims.every((c) => c.status === "incorrect"),
    ).toBe(true);
  });
  it("does not infer the direction of unboundedness without evidence", () => {
    const q = {
      ...functionQuestion("bounds", "Easy", "linear"),
      properties: [],
      falseProperties: ["bounded"],
    };
    expect(evaluateProperties("unbounded", q).claims[0].status).toBe("correct");
    expect(
      evaluateProperties("unbounded above; unbounded below", q).claims.every(
        (c) => c.status === "unverified",
      ),
    ).toBe(true);
    const bounded = { ...q, properties: ["bounded"], falseProperties: [] };
    expect(
      evaluateProperties(
        "has an upper bound; has a lower bound",
        bounded,
      ).claims.every((c) => c.status === "correct"),
    ).toBe(true);
  });
  it("does not claim rational functions are differentiable everywhere", () => {
    const q = functionQuestion("test", "Medium", "rational");
    expect(
      evaluateProperties("differentiable everywhere", q).claims[0].status,
    ).toBe("incorrect");
    expect(
      evaluateProperties("differentiable on its domain", q).claims[0].status,
    ).toBe("correct");
  });
  it("scores region fill and boundary separately", () => {
    const q = complexQuestion("disk", "Easy", "disk");
    const ref = q.reference[0];
    const centre = point(
      (Math.max(...ref.map((p) => p.x)) + Math.min(...ref.map((p) => p.x))) / 2,
      (Math.max(...ref.map((p) => p.y)) + Math.min(...ref.map((p) => p.y))) / 2,
    );
    const answer = [
      ...perfect(q),
      { id: "shade", kind: "disk" as const, points: [centre, ref[0]] },
    ];
    expect(gradePlot(q, answer).score).toBe(100);
    expect(gradePlot(q, perfect(q)).score).toBe(50);
    expect(gradePlot(q, []).score).toBe(0);
  });
  it("marks strict half-plane boundaries and excluded ray origins", () => {
    const q = complexQuestion("plane", "Medium", "halfplane"),
      x = q.reference[0][0].x;
    const fill: Item = {
      id: "r",
      kind: "region",
      points: [point(x, -5), point(6, -5), point(6, 5), point(x, 5)],
    };
    expect(gradePlot(q, [...perfect(q), fill]).score).toBe(100);
    expect(
      gradePlot(q, [...perfect(q).map((i) => ({ ...i, dashed: false })), fill])
        .score,
    ).toBe(85);
    const ray = complexQuestion("ray", "Medium", "ray");
    expect(gradePlot(ray, perfect(ray)).score).toBe(100);
    expect(
      gradePlot(
        ray,
        perfect(ray).filter((i) => i.kind !== "open"),
      ).score,
    ).toBe(75);
  });
});
describe("graph theory", () => {
  it("does not award vacuous constraint marks to an empty construction", () => {
    for (const level of levels)
      for (const q of networkGame("empty", level))
        expect(gradeNetwork(q, { vertices: [], edges: [] }).score).toBe(0);
  });
  it("checks connectivity and bipartiteness", () => {
    expect(
      components(
        network(4, [
          [0, 1],
          [2, 3],
        ]),
      ),
    ).toBe(2);
    expect(
      bipartite(
        network(3, [
          [0, 1],
          [1, 2],
          [2, 0],
        ]),
      ),
    ).toBe(false);
    expect(
      bipartite(
        network(4, [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ]),
      ),
    ).toBe(true);
  });
  it("accepts rearranged labelled graphs", () => {
    const q = networkQuestion("matrix", "Easy", 0);
    const moved = {
      ...q.answer,
      vertices: q.answer.vertices.map((v) => ({
        ...v,
        x: Math.random() * 700,
        y: Math.random() * 480,
      })),
    };
    expect(gradeNetwork(q, moved).score).toBe(100);
  });
  it("accepts different valid trees and cycles", () => {
    const q = networkQuestion("tree", "Easy", 3),
      n = q.answer.vertices.length;
    const star = network(
      n,
      Array.from({ length: n - 1 }, (_, i) => [0, i + 1] as [number, number]),
    );
    expect(gradeNetwork(q, star).score).toBe(100);
    const u = networkQuestion("cycle", "Medium", 2),
      m = u.answer.vertices.length;
    expect(
      gradeNetwork(
        u,
        network(
          m,
          Array.from({ length: m }, (_, i) => [i, (i + 1) % m]),
        ),
      ).score,
    ).toBe(100);
  });
  it("handles empty graphs and duplicate labels safely", () => {
    const q = networkQuestion("matrix", "Easy", 0);
    expect(gradeNetwork(q, { vertices: [], edges: [] }).score).toBeLessThan(
      100,
    );
    const dup = {
      ...q.answer,
      vertices: q.answer.vertices.map((v) => ({ ...v, label: "A" })),
    };
    expect(gradeNetwork(q, dup).score).toBe(0);
  });
});
describe("custom challenges and persistence", () => {
  it("parses supported custom expressions and rejects executable syntax", () => {
    const q = customFunction(
      "y = ln(x)/x",
      { xmin: 0, xmax: 5, ymin: -2, ymax: 2 },
      [0.1, 5],
    );
    expect(q.curveOnly).toBe(true);
    expect(q.reference.flat().every((p) => p.x >= 0.1)).toBe(true);
    for (const expression of ['import("foo")', "x = 2", "a[0]", "random()"])
      expect(() => customFunction(expression, DEFAULT_VIEW)).toThrow();
  });
  it("validates matrices, edge lists and graphical degree sequences", () => {
    expect(customNetwork("0 1;1 0", "matrix").answer.edges).toHaveLength(1);
    expect(() => customNetwork("0 1;0 0", "matrix")).toThrow();
    expect(() => customNetwork("A-A", "edges")).toThrow();
    expect(customNetwork("A-B, C", "edges").answer.vertices).toHaveLength(3);
    expect(
      degreeSequence(customNetwork("3,3,2,2,2", "degrees").answer),
    ).toEqual([3, 3, 2, 2, 2]);
    expect(() => customNetwork("3,3,3,1", "degrees")).toThrow();
  });
  it("parses supported custom complex conditions honestly", () => {
    expect(
      customComplex("|z-(2+1i)| = 3", DEFAULT_VIEW).reference[0][0],
    ).toEqual(point(5, 1));
    expect(customComplex("|z| <= 2", DEFAULT_VIEW).region!(point(0, 0))).toBe(
      true,
    );
    expect(customComplex("Re(z) > 1", DEFAULT_VIEW).boundaryDashed).toBe(true);
    expect(() => customComplex("arg(z^z)=pi", DEFAULT_VIEW)).toThrow();
  });
  it("persists history, recovers malformed data, reports storage failures", () => {
    let text = "";
    const store = {
      getItem: () => text,
      setItem: (_key: string, value: string) => {
        text = value;
      },
    };
    const entry: HistoryEntry = {
      id: "1",
      mode: "function",
      difficulty: "Hard",
      date: new Date().toISOString(),
      score: 450,
      questions: [{ family: "test", score: 90, title: "test" }],
    };
    expect(saveHistory([entry], store)).toBe(true);
    expect(readHistory(store)).toEqual([entry]);
    text = JSON.stringify([{ ...entry, questions: [null] }]);
    expect(readHistory(store)).toEqual([]);
    text = "broken";
    expect(readHistory(store)).toEqual([]);
    expect(
      saveHistory([entry], {
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).toBe(false);
  });
});
