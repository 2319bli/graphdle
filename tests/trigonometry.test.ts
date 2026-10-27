import { describe, expect, it } from "vitest";
import {
  FUNCTION_FAMILIES,
  functionGame,
  functionQuestion,
} from "../src/math/functions";
import { REAL_TRIG, TRIG_ALIASES, TRIG_NAMES } from "../src/math/trigFunctions";
import { trigQuestion } from "../src/math/trigonometry";
import { customFunction } from "../src/math/customFunction";
import { evaluateProperties, gradePlot } from "../src/math/grading";
import { inside, normalizedDistance } from "../src/math/geometry";
import { serializePropertyTags } from "../src/math/propertyTags";
import {
  DEFAULT_VIEW,
  type Difficulty,
  type Item,
  type PlotQuestion,
} from "../src/types";

function referenceAnswer(q: PlotQuestion): Item[] {
  return [
    ...q.reference.map((points, i) => ({
      id: `curve-${i}`,
      kind: "curve" as const,
      points,
    })),
    ...q.features.asymptotes.map((points, i) => ({
      id: `asym-${i}`,
      kind: "asymptote" as const,
      points,
    })),
    ...(["xroots", "yroots", "turns", "closed"] as const).flatMap((key) =>
      (q.features[key] || []).map((p, i) => ({
        id: `${key}-${i}`,
        kind: (
          {
            xroots: "xroot",
            yroots: "yroot",
            turns: "turn",
            closed: "closed",
          } as const
        )[key],
        points: [p],
      })),
    ),
  ];
}

describe("complete trigonometric question pool", () => {
  it("makes all 24 functions reachable in ordinary seeded sessions", () => {
    const pools = Object.values(FUNCTION_FAMILIES).flat();
    expect(new Set(pools).size).toBe(47);
    for (const name of TRIG_NAMES.filter((n) => n !== "sin"))
      expect(pools).toContain(name);
    expect(pools).toContain("sine");
    for (const level of Object.keys(FUNCTION_FAMILIES) as Difficulty[]) {
      const reached = new Set<string>(),
        single = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const qs = functionGame(`trig-pool-${i}`, level);
        expect(new Set(qs.map((q) => q.family)).size).toBe(5);
        qs.forEach((q) => reached.add(q.family));
        single.add(functionQuestion(`trig-pool-${i}`, level).family);
      }
      expect([...reached].sort()).toEqual([...FUNCTION_FAMILIES[level]].sort());
      expect([...single].sort()).toEqual([...FUNCTION_FAMILIES[level]].sort());
    }
  });
  for (const name of TRIG_NAMES) {
    it(`${name}: finite curves, valid analytic features, and complete marking`, () => {
      for (const [a, b] of [
        [1, 1],
        [2, 3],
        [3, 2],
      ]) {
        const q = trigQuestion("audit", name, a, b),
          points = q.reference.flat();
        expect(points.some((p) => inside(p, q.view))).toBe(true);
        expect(
          points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
        ).toBe(true);
        expect(
          q.properties.filter((p) => q.falseProperties?.includes(p)),
        ).toEqual([]);
        for (const p of [
          ...q.features.xroots,
          ...q.features.yroots,
          ...q.features.turns,
          ...(q.features.closed || []),
        ]) {
          expect(inside(p, q.view)).toBe(true);
          expect(
            points.some((s) => normalizedDistance(p, s, q.view) < 0.025),
            JSON.stringify(p),
          ).toBe(true);
        }
        for (const [p, end] of q.features.asymptotes) {
          if (p.x !== end.x) continue;
          for (const path of q.reference) {
            expect(
              path.some((s) => s.x < p.x - 1e-10) &&
                path.some((s) => s.x > p.x + 1e-10),
              "A curve crosses a vertical asymptote",
            ).toBe(false);
          }
        }
        // Real extrema reverse local direction; stationary inflections do not.
        for (const p of q.features.turns) {
          const scale = name.startsWith("a") ? b : 1 / b;
          const nearby = [-1, 1].map(
            (s) => a * REAL_TRIG[name]((p.x + s * scale * 0.001) / scale),
          );
          expect(
            nearby.every((y) => (p.extremum === "minimum" ? y > p.y : y < p.y)),
          ).toBe(true);
        }
        const claims = q.properties
          .filter((p) => !p.startsWith("period:"))
          .join("; ");
        expect(
          evaluateProperties(claims, q).claims.every(
            (c) => c.status === "correct",
          ),
        ).toBe(true);
        expect(gradePlot(q, referenceAnswer(q), claims).score).toBe(100);
        expect(gradePlot(q, []).score).toBe(0);
      }
    });
  }
});

describe("real inverse branches and endpoints", () => {
  it("uses explicit inverse ranges, including the continuous (0, pi) arccot convention", () => {
    const pairs = [
      ["sin", "asin", [-1, -0.4, 0, 0.7, 1]],
      ["cos", "acos", [0.1, 0.7, 1.8, 2.9]],
      ["tan", "atan", [-1, -0.3, 0, 0.8]],
      ["sec", "asec", [0, 0.7, 2, 3]],
      ["csc", "acsc", [-1.4, -0.5, 0.5, 1.4]],
      ["cot", "acot", [0.1, 0.7, 1.9, 3]],
      ["sinh", "asinh", [-3, 0, 2]],
      ["cosh", "acosh", [0, 0.5, 3]],
      ["tanh", "atanh", [-2, 0, 3]],
      ["sech", "asech", [0, 0.5, 3]],
      ["csch", "acsch", [-3, -0.2, 0.2, 3]],
      ["coth", "acoth", [-3, -0.2, 0.2, 3]],
    ] as const;
    for (const [direct, inverse, values] of pairs)
      for (const x of values)
        expect(REAL_TRIG[inverse](REAL_TRIG[direct](x))).toBeCloseTo(x, 9);
    expect(REAL_TRIG.acot(0)).toBeCloseTo(Math.PI / 2);
    expect(REAL_TRIG.acot(-2)).toBeGreaterThan(Math.PI / 2);
    expect(REAL_TRIG.acot(2)).toBeLessThan(Math.PI / 2);
  });
  it("excludes non-real intervals and preserves finite closed endpoints", () => {
    for (const name of ["asin", "acos"] as const) {
      const q = trigQuestion("domain", name, 2, 3);
      expect(q.reference.flat().every((p) => Math.abs(p.x) <= 3)).toBe(true);
      expect(q.features.closed?.map((p) => p.x)).toEqual([-3, 3]);
      expect(q.features.turns).toEqual([]);
      expect(
        evaluateProperties(
          "continuous; differentiable; continuous everywhere",
          q,
        ).claims.map((c) => c.status),
      ).toEqual(["correct", "incorrect", "incorrect"]);
    }
    for (const name of ["asec", "acsc"] as const) {
      const q = trigQuestion("domain", name, 2, 3);
      expect(q.reference.flat().every((p) => Math.abs(p.x) >= 3)).toBe(true);
      expect(q.features.closed?.map((p) => p.x)).toEqual([-3, 3]);
      expect(q.features.turns).toEqual([]);
    }
    const atanh = trigQuestion("domain", "atanh", 2, 3);
    expect(atanh.reference.flat().every((p) => Math.abs(p.x) < 3)).toBe(true);
    expect(atanh.features.closed || []).toEqual([]);
    const acoth = trigQuestion("domain", "acoth", 2, 3);
    expect(acoth.reference.flat().every((p) => Math.abs(p.x) > 3)).toBe(true);
    const acosh = trigQuestion("domain", "acosh", 2, 3);
    expect(acosh.reference.flat().every((p) => p.x >= 3)).toBe(true);
    expect(acosh.features.closed).toEqual([{ x: 3, y: 0 }]);
    const asech = trigQuestion("domain", "asech", 2, 3);
    expect(asech.reference.flat().every((p) => p.x > 0 && p.x <= 3)).toBe(true);
    expect(asech.features.closed).toEqual([{ x: 3, y: 0 }]);
  });
  it("scores actual global properties rather than branch-wise monotonicity", () => {
    for (const name of [
      "cot",
      "csc",
      "tan",
      "csch",
      "coth",
      "asec",
      "acsc",
      "acsch",
      "acoth",
    ] as const) {
      const q = trigQuestion("properties", name, 2, 3);
      expect(
        evaluateProperties(
          "increasing; decreasing; continuous everywhere",
          q,
        ).claims.every((c) => c.status === "incorrect"),
      ).toBe(true);
      expect(evaluateProperties("continuous", q).claims[0].status).toBe(
        "correct",
      );
    }
    const tan = trigQuestion("period", "tan", 2, 3);
    expect(
      evaluateProperties(
        serializePropertyTags(["period-pi-3", "period-pi"]),
        tan,
      ).claims.map((c) => c.status),
    ).toEqual(["correct", "incorrect"]);
    const tanh = trigQuestion("period", "tanh", 2, 3);
    expect(
      evaluateProperties(
        "periodic; period = pi; unbounded above; bounded",
        tanh,
      ).claims.map((c) => c.status),
    ).toEqual(["incorrect", "incorrect", "incorrect", "correct"]);
  });
});

describe("custom trig expressions", () => {
  it("supports all functions and their long-name aliases with real outputs", () => {
    for (const name of [...TRIG_NAMES, ...Object.keys(TRIG_ALIASES)]) {
      const q = customFunction(`${name}(x)`, DEFAULT_VIEW);
      expect(q.curveOnly).toBe(true);
      expect(
        q.reference.flat().some((p) => inside(p, q.view)),
        name,
      ).toBe(true);
      expect(
        q.reference.flat().every((p) => Number.isFinite(p.y)),
        name,
      ).toBe(true);
    }
    expect(
      customFunction("arctanh(x) + tanh(x)", DEFAULT_VIEW)
        .reference.flat()
        .every((p) => Math.abs(p.x) < 1),
    ).toBe(true);
    const q = customFunction("acot(x)", DEFAULT_VIEW);
    expect(q.reference.flat().every((p) => p.y > 0 && p.y < Math.PI)).toBe(
      true,
    );
    expect(q.reference.flat().find((p) => p.x === 0)?.y).toBeCloseTo(
      Math.PI / 2,
    );
  });
  it("still rejects unsupported functions and expressions with no real curve", () => {
    expect(() => customFunction("asech(-abs(x)-1)", DEFAULT_VIEW)).toThrow(
      "No real curve",
    );
    expect(() => customFunction("import(x)", DEFAULT_VIEW)).toThrow();
    expect(() => customFunction("random(x)", DEFAULT_VIEW)).toThrow();
  });
});
