import {
  DEFAULT_VIEW,
  emptyFeatures,
  type Difficulty,
  type PlotQuestion,
  type TurningPoint,
} from "../types";
import { inside, parametric, point, sampleFunction } from "./geometry";
import { integer, random, shuffle } from "./random";
import { isTrigName } from "./trigFunctions";
import { trigQuestion } from "./trigonometry";
export const FUNCTION_FAMILIES: Record<Difficulty, string[]> = {
  Easy: [
    "linear",
    "quadratic",
    "cubic",
    "reciprocal",
    "exponential",
    "sine",
    "cos",
  ],
  Medium: [
    "rational",
    "logarithm",
    "modulus",
    "trig",
    "piecewise",
    "hole",
    "tan",
    "sinh",
    "cosh",
    "tanh",
  ],
  Hard: [
    "logratio",
    "decay",
    "bounded",
    "drift",
    "ellipse",
    "parametric",
    "cot",
    "sec",
    "csc",
    "asin",
    "acos",
    "atan",
    "asinh",
    "acosh",
    "atanh",
    "sech",
  ],
  Expert: [
    "power",
    "singular",
    "oscillation",
    "hyperbola",
    "stationary",
    "rationalpair",
    "asec",
    "acsc",
    "acot",
    "csch",
    "coth",
    "asech",
    "acsch",
    "acoth",
  ],
};
const term = (x: number) => (x < 0 ? `− ${-x}` : `+ ${x}`);
export function functionQuestion(
  seed: string,
  difficulty: Difficulty,
  family?: string,
): PlotQuestion {
  const r = random(seed),
    a = integer(r, 1, 3),
    h = integer(r, -2, 2),
    k = integer(r, -2, 2),
    b = integer(r, 1, 3);
  const pool = FUNCTION_FAMILIES[difficulty];
  const f = family || pool[integer(r, 0, pool.length - 1)];
  if (isTrigName(f)) return trigQuestion(seed, f, a, b);
  const q: PlotQuestion = {
    mode: "function",
    id: seed,
    family: f,
    title: "",
    detail: "Sketch the curve and mark its features in the assessment window.",
    view: { ...DEFAULT_VIEW },
    reference: [],
    features: emptyFeatures(),
    properties: [],
    explanation: "",
  };
  let fn: (x: number) => number = () => NaN;
  let breaks: number[] = [];
  const xr = (x: number) => q.features.xroots.push(point(x, 0));
  const yr = (y: number) => q.features.yroots.push(point(0, y));
  const turn = (
    x: number,
    y: number,
    kind: TurningPoint["kind"] = "smooth",
    extremum?: TurningPoint["extremum"],
  ) => q.features.turns.push({ x, y, kind, extremum });
  const vertical = (x: number) =>
    q.features.asymptotes.push([point(x, q.view.ymin), point(x, q.view.ymax)]);
  const horizontal = (y: number) =>
    q.features.asymptotes.push([point(q.view.xmin, y), point(q.view.xmax, y)]);
  switch (f) {
    case "linear":
      fn = (x) => a * x + k;
      q.title = `y = ${a}x ${term(k)}`;
      xr(-k / a);
      yr(k);
      q.properties = [
        "continuous",
        "differentiable",
        "increasing",
        "injective",
      ];
      q.falseProperties = ["bounded", "decreasing", "periodic"];
      break;
    case "quadratic":
      fn = (x) => a * (x - h) ** 2 - b;
      q.title = `y = ${a}(x ${term(-h)})² − ${b}`;
      q.view = { xmin: -5, xmax: 5, ymin: -5, ymax: 12 };
      xr(h - Math.sqrt(b / a));
      xr(h + Math.sqrt(b / a));
      yr(fn(0));
      turn(h, -b);
      q.properties = ["continuous", "differentiable", "bounded below"];
      q.falseProperties = [
        "injective",
        "increasing",
        "decreasing",
        "bounded above",
        "periodic",
      ];
      if (h === 0) q.properties.push("even");
      break;
    case "cubic":
      fn = (x) => (x ** 3 - 3 * a * x) / 3;
      q.title = `y = x³/3 − ${a}x`;
      q.view = { xmin: -4, xmax: 4, ymin: -8, ymax: 8 };
      [-Math.sqrt(3 * a), 0, Math.sqrt(3 * a)].forEach(xr);
      yr(0);
      [-Math.sqrt(a), Math.sqrt(a)].forEach((x) => turn(x, fn(x)));
      q.properties = [
        "odd",
        "continuous",
        "differentiable",
        "inflection at zero",
      ];
      q.falseProperties = [
        "even",
        "injective",
        "increasing",
        "decreasing",
        "bounded",
      ];
      break;
    case "reciprocal":
      fn = (x) => (x === 0 ? NaN : a / x);
      q.title = `y = ${a}/x`;
      breaks = [0];
      vertical(0);
      horizontal(0);
      q.properties = ["odd", "continuous", "differentiable", "injective"];
      q.falseProperties = ["even", "bounded", "periodic"];
      q.detail = "Domain: x ≠ 0. Draw the two branches separately.";
      break;
    case "exponential":
      fn = (x) => Math.exp(x / a);
      q.title = `y = e^(x/${a})`;
      yr(1);
      horizontal(0);
      q.properties = [
        "continuous",
        "differentiable",
        "increasing",
        "injective",
        "positive",
        "bounded below",
      ];
      q.falseProperties = [
        "even",
        "odd",
        "decreasing",
        "periodic",
        "bounded above",
      ];
      break;
    case "sine":
    case "trig": {
      const freq = f === "sine" ? 1 : b;
      fn = (x) => a * Math.sin(freq * x);
      q.title = `y = ${a}sin(${freq}x)`;
      q.view = { xmin: -2 * Math.PI, xmax: 2 * Math.PI, ymin: -4, ymax: 4 };
      for (let j = -2 * freq; j <= 2 * freq; j++) xr((j * Math.PI) / freq);
      for (let j = -2 * freq; j < 2 * freq; j++) {
        const x = (Math.PI / 2 + j * Math.PI) / freq;
        turn(x, fn(x));
      }
      yr(0);
      q.properties = [
        "odd",
        "continuous",
        "differentiable",
        "bounded",
        "bounded above",
        "bounded below",
        "periodic",
        `period:${(2 * Math.PI) / freq}`,
      ];
      q.falseProperties = ["even", "injective", "increasing", "decreasing"];
      break;
    }
    case "rational":
      fn = (x) => (x === h ? NaN : k + a / (x - h));
      q.title = `y = ${k} + ${a}/(x ${term(-h)})`;
      breaks = [h];
      vertical(h);
      horizontal(k);
      if (k !== 0) xr(h - a / k);
      if (h !== 0) yr(fn(0));
      q.properties = ["continuous", "differentiable", "injective"];
      q.falseProperties = ["bounded", "periodic"];
      q.detail = `Domain: x ≠ ${h}. Draw each branch separately.`;
      break;
    case "logarithm":
      fn = (x) => (x > h ? a * Math.log(x - h) : NaN);
      q.title = `y = ${a}ln(x ${term(-h)})`;
      breaks = [h];
      vertical(h);
      xr(h + 1);
      if (h < 0) yr(fn(0));
      q.properties = [
        "continuous",
        "differentiable",
        "increasing",
        "injective",
      ];
      q.falseProperties = ["bounded", "periodic", "decreasing"];
      q.detail = `Domain: x > ${h}.`;
      break;
    case "modulus":
      fn = (x) => a * Math.abs(x - h) - b;
      q.title = `y = ${a}|x ${term(-h)}| − ${b}`;
      xr(h - b / a);
      xr(h + b / a);
      yr(fn(0));
      turn(h, -b, "corner", "minimum");
      q.properties = ["continuous", "bounded below"];
      q.falseProperties = [
        "differentiable",
        "injective",
        "increasing",
        "decreasing",
        "bounded above",
      ];
      q.explanation =
        "The vertex is a local minimum, even though the derivative does not exist there.";
      if (h === 0) q.properties.push("even");
      break;
    case "piecewise":
      fn = (x) => (x < h ? -a * (x - h) + k : (x - h) ** 2 + k);
      q.title = `y = { −${a}(x ${term(-h)}) ${term(k)}, x < ${h}; (x ${term(-h)})² ${term(k)}, x ≥ ${h} }`;
      if (k <= 0) {
        xr(h + k / a);
        if (k < 0) xr(h + Math.sqrt(-k));
      }
      yr(fn(0));
      turn(h, k, "corner", "minimum");
      q.properties = ["continuous", "bounded below"];
      q.falseProperties = [
        "differentiable",
        "injective",
        "increasing",
        "decreasing",
      ];
      q.explanation =
        "The two pieces meet continuously at the corner, which is a local minimum.";
      break;
    case "hole":
      fn = (x) => (Math.abs(x - h) < 1e-9 ? NaN : x + h);
      q.title = `y = (x² − ${h * h})/(x ${term(-h)}), x ≠ ${h}`;
      breaks = [h];
      q.features.open = [point(h, 2 * h)];
      if (h !== 0) {
        xr(-h);
        yr(h);
      }
      q.properties = [
        "continuous",
        "differentiable",
        "increasing",
        "injective",
      ];
      q.falseProperties = ["bounded", "periodic"];
      q.explanation = `Cancel the factor x ${term(-h)} to get y = x ${term(h)}, but keep the hole at (${h}, ${2 * h}). Use the open-point tool.`;
      break;
    case "logratio":
      fn = (x) => (x > 0 ? (a * Math.log(x)) / x : NaN);
      q.title = `y = ${a}ln(x)/x`;
      q.view = { xmin: -1, xmax: 10, ymin: -3, ymax: 2 };
      breaks = [0];
      xr(1);
      turn(Math.E, a / Math.E);
      vertical(0);
      horizontal(0);
      q.properties = ["continuous", "differentiable", "bounded above"];
      q.falseProperties = [
        "injective",
        "bounded below",
        "increasing",
        "decreasing",
      ];
      q.detail = "Domain: x > 0.";
      q.explanation = `The derivative is ${a}(1 − ln x)/x², giving a maximum at (e, ${a}/e).`;
      break;
    case "decay":
      fn = (x) => a * x * x * Math.exp(-x);
      q.title = `y = ${a}x²e^(−x)`;
      q.view = { xmin: -2, xmax: 9, ymin: -1, ymax: 8 };
      xr(0);
      yr(0);
      turn(0, 0);
      turn(2, (4 * a) / Math.E ** 2);
      horizontal(0);
      q.properties = [
        "continuous",
        "differentiable",
        "nonnegative",
        "bounded below",
      ];
      q.falseProperties = [
        "injective",
        "even",
        "odd",
        "increasing",
        "decreasing",
      ];
      q.explanation =
        "Differentiate to get ax(2 − x)e^(−x). The curve touches the axis at 0, peaks at 2, and approaches y = 0 as x → ∞.";
      break;
    case "bounded":
      fn = (x) => (x * x - a) / (x * x + a);
      q.title = `y = (x² − ${a})/(x² + ${a})`;
      q.view = { xmin: -7, xmax: 7, ymin: -2, ymax: 2 };
      xr(-Math.sqrt(a));
      xr(Math.sqrt(a));
      yr(-1);
      turn(0, -1);
      horizontal(1);
      q.properties = [
        "even",
        "continuous",
        "differentiable",
        "bounded",
        "bounded below",
        "bounded above",
      ];
      q.falseProperties = ["odd", "injective", "increasing", "decreasing"];
      q.explanation =
        "Rewrite as 1 − 2a/(x² + a). The range is [−1, 1), with a minimum at (0, −1).";
      break;
    case "drift":
      fn = (x) => x + a * Math.sin(x);
      q.title = `y = x + ${a}sin(x)`;
      q.view = { xmin: -7, xmax: 7, ymin: -8, ymax: 8 };
      xr(0);
      yr(0);
      if (a > 1) {
        const t = Math.acos(-1 / a);
        for (let j = -2; j <= 2; j++)
          for (const s of [-1, 1]) {
            const x = s * t + 2 * j * Math.PI;
            if (x >= -7 && x <= 7) turn(x, fn(x));
          }
      }
      q.properties = ["odd", "continuous", "differentiable"];
      if (a === 1) q.properties.push("increasing", "injective");
      else q.falseProperties = ["increasing", "injective"];
      q.explanation =
        "The curve oscillates around y = x. That line is not an asymptote: the vertical difference does not tend to zero.";
      break;
    case "ellipse": {
      q.title = `x² + xy + y² = ${a * a}`;
      q.view = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 };
      q.reference = [
        parametric(
          (t) => {
            const u = a * Math.sqrt(2 / 3) * Math.cos(t),
              v = a * Math.sqrt(2) * Math.sin(t);
            return point((u + v) / Math.sqrt(2), (u - v) / Math.sqrt(2));
          },
          0,
          2 * Math.PI,
        ),
      ];
      xr(a);
      xr(-a);
      yr(a);
      yr(-a);
      turn(-a / Math.sqrt(3), (2 * a) / Math.sqrt(3));
      turn(a / Math.sqrt(3), (-2 * a) / Math.sqrt(3));
      q.properties = ["origin symmetry", "bounded"];
      q.falseProperties = ["even"];
      q.explanation =
        "This is a rotated ellipse. Horizontal tangents satisfy 2x + y = 0, and vertical tangents satisfy x + 2y = 0.";
      break;
    }
    case "parametric":
      q.title = `x = ${a + 1}cos t, y = ${b}sin t, 0 ≤ t ≤ 2π`;
      q.reference = [
        parametric(
          (t) => point((a + 1) * Math.cos(t), b * Math.sin(t)),
          0,
          2 * Math.PI,
        ),
      ];
      xr(a + 1);
      xr(-a - 1);
      yr(b);
      yr(-b);
      turn(0, b);
      turn(0, -b);
      q.properties = [
        "origin symmetry",
        "bounded",
        "y-axis symmetry",
        "x-axis symmetry",
      ];
      q.explanation =
        "The parametric curve is an ellipse centred at the origin.";
      break;
    case "power":
      fn = (x) => (x > 0 ? Math.pow(x, x) * a : NaN);
      q.title = `y = ${a}x^x, x > 0`;
      q.view = { xmin: -0.5, xmax: 3, ymin: 0, ymax: 10 };
      turn(1 / Math.E, a * Math.exp(-1 / Math.E));
      q.features.open = [point(0, a)];
      q.properties = [
        "continuous",
        "differentiable",
        "positive",
        "bounded below",
      ];
      q.falseProperties = [
        "injective",
        "increasing",
        "decreasing",
        "bounded above",
      ];
      q.explanation = `Logarithmic differentiation gives y′ = ${a}x^x(ln x + 1). The minimum is at x = 1/e, and the excluded limit at x = 0 is ${a}.`;
      break;
    case "singular":
      fn = (x) => (x === 0 ? NaN : x + a / x);
      q.title = `y = x + ${a}/x, x ≠ 0`;
      q.view = { xmin: -7, xmax: 7, ymin: -9, ymax: 9 };
      breaks = [0];
      turn(Math.sqrt(a), 2 * Math.sqrt(a));
      turn(-Math.sqrt(a), -2 * Math.sqrt(a));
      vertical(0);
      q.features.asymptotes.push([point(-7, -7), point(7, 7)]);
      q.properties = ["odd", "continuous", "differentiable"];
      q.falseProperties = [
        "even",
        "injective",
        "bounded",
        "increasing",
        "decreasing",
      ];
      q.explanation = `The derivative is 1 − ${a}/x². There are two branches, a vertical asymptote x = 0 and an oblique asymptote y = x.`;
      break;
    case "oscillation": {
      fn = (x) => (x === 0 ? NaN : x * Math.sin(a / x));
      q.title = `y = x sin(${a}/x), |x| ≥ ${a / 4}`;
      q.view = { xmin: -6, xmax: 6, ymin: -1, ymax: 4 };
      const base = fn;
      fn = (x) => (Math.abs(x) >= a / 4 ? base(x) : NaN);
      breaks = [-a / 4, a / 4];
      xr(a / Math.PI);
      xr(-a / Math.PI);
      horizontal(a);
      q.features.closed = [
        point(-a / 4, base(-a / 4)),
        point(a / 4, base(a / 4)),
      ];
      q.properties = [
        "even",
        "continuous",
        "differentiable",
        "bounded",
        "bounded below",
        "bounded above",
      ];
      q.falseProperties = ["odd", "injective"];
      q.detail = `Restricted domain |x| ≥ ${a / 4}; the oscillatory neighbourhood of zero is intentionally excluded. Mark both closed endpoints.`;
      q.explanation = `As |x| → ∞, sin(${a}/x) ∼ ${a}/x, so y → ${a}. Within this restricted domain each branch is monotone.`;
      break;
    }
    case "hyperbola": {
      q.title = `x² + xy − y² = ${a * a}`;
      q.view = { xmin: -7, xmax: 7, ymin: -7, ymax: 7 };
      const theta = 0.5 * Math.atan(0.5),
        scale = a / Math.sqrt(Math.sqrt(5) / 2);
      q.reference = [1, -1].map((sign) =>
        parametric(
          (t) =>
            point(
              sign *
                scale *
                (Math.cosh(t) * Math.cos(theta) -
                  Math.sinh(t) * Math.sin(theta)),
              sign *
                scale *
                (Math.cosh(t) * Math.sin(theta) +
                  Math.sinh(t) * Math.cos(theta)),
            ),
          -4,
          4,
        ),
      );
      xr(a);
      xr(-a);
      for (const m of [(1 + Math.sqrt(5)) / 2, (1 - Math.sqrt(5)) / 2])
        q.features.asymptotes.push([point(-7, -7 * m), point(7, 7 * m)]);
      q.properties = ["origin symmetry"];
      q.falseProperties = ["bounded", "even"];
      q.explanation =
        "This rotated hyperbola has two branches and no horizontal tangencies. Its asymptote slopes solve m² − m − 1 = 0, so they are (1 ± √5)/2.";
      break;
    }
    case "stationary":
      fn = (x) => x ** 5 / 5 - (a * x ** 3) / 3;
      q.title = `y = x⁵/5 − ${a}x³/3`;
      q.view = { xmin: -3, xmax: 3, ymin: -6, ymax: 6 };
      xr(0);
      xr(Math.sqrt((5 * a) / 3));
      xr(-Math.sqrt((5 * a) / 3));
      yr(0);
      turn(Math.sqrt(a), fn(Math.sqrt(a)));
      turn(-Math.sqrt(a), fn(-Math.sqrt(a)));
      q.properties = [
        "odd",
        "continuous",
        "differentiable",
        "inflection at zero",
      ];
      q.falseProperties = ["even", "injective", "increasing", "decreasing"];
      q.explanation =
        "The derivative is x²(x² − a). At zero it vanishes without changing sign: this is a stationary inflection, not a turning point.";
      break;
    case "rationalpair":
      fn = (x) => (Math.abs(x) === a ? NaN : x / (x * x - a * a));
      q.title = `y = x/(x² − ${a * a}), x ≠ ±${a}`;
      q.view = { xmin: -7, xmax: 7, ymin: -4, ymax: 4 };
      breaks = [-a, a];
      xr(0);
      yr(0);
      vertical(-a);
      vertical(a);
      horizontal(0);
      q.properties = ["odd", "continuous", "differentiable"];
      q.falseProperties = ["even", "bounded", "increasing", "injective"];
      q.explanation =
        "The derivative is −(x² + a²)/(x² − a²)², so each of the three branches is strictly decreasing. There are no turning points.";
      break;
    default:
      throw new Error("Unsupported function family");
  }
  // Global y-bounds established analytically for these parameterised families
  // (a and b are positive). These concern the full stated domain, not the viewport.
  const upperBounded = [
    "sine",
    "trig",
    "logratio",
    "bounded",
    "ellipse",
    "parametric",
    "oscillation",
  ].includes(f);
  const lowerBounded = [
    "quadratic",
    "exponential",
    "sine",
    "trig",
    "modulus",
    "piecewise",
    "decay",
    "bounded",
    "ellipse",
    "parametric",
    "power",
    "oscillation",
  ].includes(f);
  for (const [side, hasBound] of [
    ["above", upperBounded],
    ["below", lowerBounded],
  ] as const) {
    q.properties.push(`${hasBound ? "bounded" : "unbounded"} ${side}`);
    q.falseProperties = [
      ...(q.falseProperties || []),
      `${hasBound ? "unbounded" : "bounded"} ${side}`,
    ];
  }
  q.properties.push(upperBounded && lowerBounded ? "bounded" : "unbounded");
  q.falseProperties!.push(
    upperBounded && lowerBounded ? "unbounded" : "bounded",
  );
  q.properties = [...new Set(q.properties)];
  q.falseProperties = [...new Set(q.falseProperties)];
  if (!q.reference.length) q.reference = sampleFunction(fn, q.view, breaks);
  for (const key of ["xroots", "yroots", "turns", "open", "closed"] as const) {
    const list = q.features[key];
    if (list) q.features[key] = list.filter((p) => inside(p, q.view));
  }
  q.explanation ||=
    "Compare your sketch with the reference, then check the marked intercepts, local extrema and asymptotes. Properties refer to the stated domain.";
  return q;
}
export function functionGame(seed: string, difficulty: Difficulty) {
  return shuffle(FUNCTION_FAMILIES[difficulty], random(seed))
    .slice(0, 5)
    .map((f, i) => functionQuestion(`${seed}-${i}`, difficulty, f));
}
