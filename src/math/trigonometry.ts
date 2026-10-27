import {
  emptyFeatures,
  type PlotQuestion,
  type Point,
  type View,
} from "../types";
import { inside, point, sampleFunction } from "./geometry";
import { REAL_TRIG, type TrigName } from "./trigFunctions";

/** Analytic features of y = a f(bx), or y = a f(x/b) for inverse functions. */
export function trigQuestion(
  id: string,
  name: TrigName,
  a: number,
  b: number,
): PlotQuestion {
  const inverse = name.startsWith("a"),
    scale = inverse ? b : 1 / b,
    fn = (x: number) => a * REAL_TRIG[name](x / scale),
    arg = b === 1 ? "x" : inverse ? `x/${b}` : `${b}x`,
    label = inverse ? `arc${name.slice(1)}` : name;
  const q: PlotQuestion = {
    mode: "function",
    id,
    family: name,
    title: `y = ${a === 1 ? "" : a}${label}(${arg})`,
    detail: "",
    view: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
    reference: [],
    features: emptyFeatures(),
    properties: ["continuous", "differentiable"],
    allRealDomain: true,
    explanation: "",
  };
  // Work in unscaled coordinates until all analytic features are constructed.
  const view = (xmin: number, xmax: number, ymin: number, ymax: number) => {
    q.view = { xmin, xmax, ymin, ymax };
  };
  const xr = (x: number) => q.features.xroots.push(point(x, 0));
  const yr = (y: number) => q.features.yroots.push(point(0, y));
  const turn = (x: number, y: number, extremum: "minimum" | "maximum") =>
    q.features.turns.push({ x, y, kind: "smooth", extremum });
  const closed = (x: number, y: number) =>
    (q.features.closed ??= []).push(point(x, y));
  const poles: number[] = [],
    horizontal: number[] = [],
    edges: number[] = [];
  const props = (...p: string[]) => q.properties.push(...p);
  let domain = "x ∈ ℝ",
    range = "",
    note = "",
    period: number | undefined;
  const pi = (n: number, d = 1) => {
    const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
    const divisor = gcd(n, d);
    n /= divisor;
    d /= divisor;
    return `${n === 1 ? "" : n}π${d === 1 ? "" : `/${d}`}`;
  };
  const restricted = (description: string) => {
    q.allRealDomain = false;
    domain = description;
  };
  const finiteEndpoint = () => {
    // Included vertical-tangent endpoints are not two-sided turning points.
    q.properties = q.properties.filter((p) => p !== "differentiable");
    note +=
      " Included endpoints have vertical tangents; mark them with closed points, not turning-point stars.";
  };
  switch (name) {
    case "sin":
    case "cos": {
      const sine = name === "sin";
      view(-2 * Math.PI, 2 * Math.PI, -1.5, 1.5);
      period = 2 * Math.PI;
      props(sine ? "odd" : "even");
      if (sine) props("inflection at zero");
      for (let j = -3; j <= 3; j++) {
        xr((j + (sine ? 0 : 0.5)) * Math.PI);
        const x = (j + (sine ? 0.5 : 0)) * Math.PI,
          y = REAL_TRIG[name](x);
        turn(x, y, y > 0 ? "maximum" : "minimum");
      }
      yr(sine ? 0 : 1);
      note =
        "The amplitude is " + a + ". Mark the peaks and troughs with stars.";
      break;
    }
    case "tan":
    case "cot":
    case "sec":
    case "csc": {
      view(-2 * Math.PI, 2 * Math.PI, -4, 4);
      const cosinePoles = name === "tan" || name === "sec";
      period = name === "tan" || name === "cot" ? Math.PI : 2 * Math.PI;
      props(name === "sec" ? "even" : "odd");
      restricted(
        cosinePoles ? `x ≠ (π/2 + nπ)/${b}, n ∈ ℤ` : `x ≠ nπ/${b}, n ∈ ℤ`,
      );
      for (let j = -3; j <= 3; j++) {
        poles.push((j + (cosinePoles ? 0.5 : 0)) * Math.PI);
        if (name === "tan" || name === "cot")
          xr((j + (name === "cot" ? 0.5 : 0)) * Math.PI);
        else {
          const x = (j + (name === "csc" ? 0.5 : 0)) * Math.PI,
            y = REAL_TRIG[name](x);
          turn(x, y, y > 0 ? "minimum" : "maximum");
        }
      }
      if (name === "tan") {
        yr(0);
        props("inflection at zero");
      }
      if (name === "sec") yr(1);
      note =
        "Draw separate branches between the vertical asymptotes. Monotonicity on one branch does not mean monotonicity over the entire domain.";
      break;
    }
    case "asin":
    case "acos": {
      const sine = name === "asin";
      view(-1.4, 1.4, sine ? -2 : -0.4, sine ? 2 : 3.6);
      restricted(`−${b} ≤ x ≤ ${b}`);
      range = sine ? `−${pi(a, 2)} ≤ y ≤ ${pi(a, 2)}` : `0 ≤ y ≤ ${pi(a)}`;
      edges.push(-1, 1);
      closed(-1, sine ? -Math.PI / 2 : Math.PI);
      closed(1, sine ? Math.PI / 2 : 0);
      xr(sine ? 0 : 1);
      yr(sine ? 0 : Math.PI / 2);
      props("injective", sine ? "increasing" : "decreasing");
      if (sine) props("odd", "inflection at zero");
      else props("nonnegative", "inflection at zero");
      finiteEndpoint();
      break;
    }
    case "atan":
    case "acot": {
      const tangent = name === "atan";
      view(-5, 5, tangent ? -2 : -0.4, tangent ? 2 : 3.6);
      range = tangent ? `−${pi(a, 2)} < y < ${pi(a, 2)}` : `0 < y < ${pi(a)}`;
      horizontal.push(
        ...(tangent ? [-Math.PI / 2, Math.PI / 2] : [0, Math.PI]),
      );
      yr(tangent ? 0 : Math.PI / 2);
      if (tangent) xr(0);
      props(
        "injective",
        "inflection at zero",
        tangent ? "increasing" : "decreasing",
      );
      if (tangent) props("odd");
      else props("positive", "nonnegative");
      if (!tangent)
        note =
          "Graphdle uses arccot(u) = π/2 − arctan(u), with values between 0 and π before vertical scaling.";
      break;
    }
    case "asec":
    case "acsc": {
      const secant = name === "asec";
      view(-5, 5, secant ? -0.4 : -2, secant ? 3.6 : 2);
      restricted(`x ≤ −${b} or x ≥ ${b}`);
      range = secant
        ? `0 ≤ y ≤ ${pi(a)}, y ≠ ${pi(a, 2)}`
        : `−${pi(a, 2)} ≤ y ≤ ${pi(a, 2)}, y ≠ 0`;
      edges.push(-1, 1);
      closed(-1, secant ? Math.PI : -Math.PI / 2);
      closed(1, secant ? 0 : Math.PI / 2);
      horizontal.push(secant ? Math.PI / 2 : 0);
      props("injective");
      if (secant) {
        xr(1);
        props("nonnegative");
      } else props("odd");
      note =
        "Draw both disconnected branches; the excluded middle interval is not part of the graph.";
      finiteEndpoint();
      break;
    }
    case "sinh":
      view(-3, 3, -5, 5);
      xr(0);
      yr(0);
      props("odd", "increasing", "injective", "inflection at zero");
      note =
        "Sinh is increasing and unbounded; unlike sine, it is not periodic.";
      break;
    case "cosh":
      view(-3, 3, -0.5, 5);
      yr(1);
      turn(0, 1, "minimum");
      props("even", "positive", "nonnegative");
      note = "Cosh has a smooth minimum at x = 0 and no x-intercepts.";
      break;
    case "tanh":
      view(-4, 4, -1.4, 1.4);
      xr(0);
      yr(0);
      horizontal.push(-1, 1);
      props("odd", "increasing", "injective", "inflection at zero");
      note =
        "Tanh increases between its two horizontal asymptotes and is not periodic.";
      break;
    case "sech":
      view(-4, 4, -0.3, 1.4);
      yr(1);
      turn(0, 1, "maximum");
      horizontal.push(0);
      props("even", "positive", "nonnegative");
      note =
        "Sech is the reciprocal of cosh: a positive, even curve with a smooth maximum at x = 0.";
      break;
    case "csch":
    case "coth":
      view(-4, 4, -4, 4);
      restricted("x ≠ 0");
      poles.push(0);
      horizontal.push(...(name === "csch" ? [0] : [-1, 1]));
      props("odd", "injective");
      note =
        "Each branch decreases, but the function is not globally decreasing across its disconnected domain.";
      break;
    case "asinh":
      view(-4, 4, -3, 3);
      xr(0);
      yr(0);
      props("odd", "increasing", "injective", "inflection at zero");
      range = "y ∈ ℝ";
      break;
    case "acosh":
      view(-0.5, 5, -0.5, 3);
      restricted(`x ≥ ${b}`);
      edges.push(1);
      closed(1, 0);
      xr(1);
      props("increasing", "injective", "nonnegative");
      range = "y ≥ 0";
      finiteEndpoint();
      break;
    case "atanh":
      view(-1.3, 1.3, -3, 3);
      restricted(`−${b} < x < ${b}`);
      poles.push(-1, 1);
      xr(0);
      yr(0);
      props("odd", "increasing", "injective", "inflection at zero");
      range = "y ∈ ℝ";
      break;
    case "asech":
      view(-0.2, 1.3, -0.5, 4);
      restricted(`0 < x ≤ ${b}`);
      poles.push(0);
      edges.push(1);
      closed(1, 0);
      xr(1);
      props("decreasing", "injective", "nonnegative");
      range = "y ≥ 0";
      finiteEndpoint();
      break;
    case "acsch":
      view(-4, 4, -3, 3);
      restricted("x ≠ 0");
      poles.push(0);
      horizontal.push(0);
      props("odd", "injective");
      range = "y ≠ 0";
      note =
        "Both branches decrease separately; do not connect them through the vertical asymptote.";
      break;
    case "acoth":
      view(-4, 4, -3, 3);
      restricted(`x < −${b} or x > ${b}`);
      poles.push(-1, 1);
      horizontal.push(0);
      props("odd", "injective");
      range = "y ≠ 0";
      note =
        "Only the two outer intervals belong to the real domain. There is no middle branch.";
      break;
  }

  const bothBounds = [
    "sin",
    "cos",
    "asin",
    "acos",
    "atan",
    "acot",
    "asec",
    "acsc",
    "tanh",
    "sech",
  ].includes(name);
  const lowerBound = bothBounds || ["cosh", "acosh", "asech"].includes(name);
  if (bothBounds) props("bounded", "bounded above");
  else props("unbounded", "unbounded above");
  props(lowerBound ? "bounded below" : "unbounded below");
  if (period) props("periodic", `period:${period * scale}`);
  const known = [
    "even",
    "odd",
    "continuous",
    "differentiable",
    "increasing",
    "decreasing",
    "injective",
    "periodic",
    "bounded",
    "bounded above",
    "bounded below",
    "positive",
    "nonnegative",
    "inflection at zero",
    "x-axis symmetry",
  ];
  q.falseProperties = known.filter((p) => !q.properties.includes(p));

  const transform = (p: Point): Point => point(p.x * scale, p.y * a);
  const baseView = q.view;
  q.view = {
    xmin: baseView.xmin * scale,
    xmax: baseView.xmax * scale,
    ymin: baseView.ymin * a,
    ymax: baseView.ymax * a,
  };
  for (const key of ["xroots", "yroots", "closed"] as const)
    if (q.features[key])
      q.features[key] = q.features[key]!.map(transform).filter((p) =>
        inside(p, q.view),
      );
  q.features.turns = q.features.turns
    .map((p) => ({ ...p, ...transform(p) }))
    .filter((p) => inside(p, q.view));
  for (const u of poles) {
    const x = u * scale;
    if (x >= q.view.xmin && x <= q.view.xmax)
      q.features.asymptotes.push([
        point(x, q.view.ymin),
        point(x, q.view.ymax),
      ]);
  }
  for (const v of horizontal) {
    const y = v * a;
    if (y >= q.view.ymin && y <= q.view.ymax)
      q.features.asymptotes.push([
        point(q.view.xmin, y),
        point(q.view.xmax, y),
      ]);
  }
  q.reference = sampleBranches(
    fn,
    q.view,
    [...poles, ...edges].map((x) => x * scale),
  );
  q.detail =
    `${["sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "asec", "acsc", "acot"].includes(name) ? "Angles in radians. " : ""}Domain: ${domain}.${range ? ` Principal range: ${range}.` : ""} ${q.features.closed?.length ? "Mark the included endpoints with closed points." : ""}`.trim();
  q.explanation = `${note.trim() || "Use the stated domain and principal branch when sketching this inverse function."}${period ? ` The fundamental period is ${pi(name === "tan" || name === "cot" ? 1 : 2, b)}.` : ""} Properties refer to the full stated domain.`;
  return q;
}

/** Split BEFORE sampling, so no segment can jump across a pole or domain gap. */
function sampleBranches(
  fn: (x: number) => number,
  view: View,
  boundaries: number[],
) {
  const cuts = [
    ...new Set([
      view.xmin,
      ...boundaries.filter((x) => x > view.xmin && x < view.xmax),
      view.xmax,
    ]),
  ].sort((a, b) => a - b);
  return cuts.slice(1).flatMap((right, i) => {
    const left = cuts[i];
    if (!Number.isFinite(fn((left + right) / 2))) return [];
    // Closed domain endpoints are included exactly. A pole is approached only
    // from within this interval; its non-finite value is discarded by sampling.
    return sampleFunction(fn, { ...view, xmin: left, xmax: right }, [], 450);
  });
}
