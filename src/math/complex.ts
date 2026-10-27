import {
  DEFAULT_VIEW,
  emptyFeatures,
  type Difficulty,
  type PlotQuestion,
  type View,
} from "../types";
import { parametric, point, sampleFunction } from "./geometry";
import { integer, random, shuffle } from "./random";
const families: Record<Difficulty, string[]> = {
  Easy: ["circle", "point", "disk", "line", "vertical", "horizontal"],
  Medium: ["bisector", "ray", "halfplane", "ellipse", "circle", "disk"],
  Hard: ["hyperbola", "annulus", "sector", "lens", "ellipse", "ray"],
  Expert: ["squaremap", "hyperbola", "sector", "lens", "annulus", "ellipse"],
};
const ztext = (h: number, k: number) =>
  `(${h} ${k < 0 ? "−" : "+"} ${Math.abs(k)}i)`;
export function complexQuestion(
  seed: string,
  difficulty: Difficulty,
  family?: string,
): PlotQuestion {
  const r = random(seed),
    h = integer(r, -2, 2),
    k = integer(r, -2, 2),
    a = integer(r, 1, 3),
    b = integer(r, 1, 2);
  const f = family || families[difficulty][integer(r, 0, 5)];
  const q: PlotQuestion = {
    mode: "complex",
    id: seed,
    family: f,
    title: "",
    detail:
      "Draw the locus in the Argand plane. Use dashed boundaries for strict inequalities.",
    view: { ...DEFAULT_VIEW },
    reference: [],
    features: emptyFeatures(),
    properties: [],
    explanation: "",
  };
  const circle = (x: number, y: number, radius: number) =>
    parametric(
      (t) => point(x + radius * Math.cos(t), y + radius * Math.sin(t)),
      0,
      2 * Math.PI,
    );
  switch (f) {
    case "point":
      q.title = `z = ${h} ${k < 0 ? "−" : "+"} ${Math.abs(k)}i`;
      q.reference = [];
      q.features.closed = [point(h, k)];
      q.explanation = `Plot the point (${h}, ${k}): real part horizontally, imaginary part vertically.`;
      break;
    case "circle":
    case "disk":
      q.title = `|z − ${ztext(h, k)}| ${f === "circle" ? "=" : "≤"} ${a}`;
      q.reference = [circle(h, k, a)];
      if (f === "disk")
        q.region = (p) => (p.x - h) ** 2 + (p.y - k) ** 2 <= a * a;
      q.explanation = `${f === "circle" ? "Circle" : "Closed disk"} with centre (${h}, ${k}) and radius ${a}. ${f === "disk" ? "Include the boundary and shade the interior." : ""}`;
      break;
    case "line":
      q.title = `Im(z) = ${a} Re(z) ${k < 0 ? "−" : "+"} ${Math.abs(k)}`;
      q.reference = [[point(-6, -6 * a + k), point(6, 6 * a + k)]];
      q.explanation = `This is the full straight line y = ${a}x + ${k}.`;
      break;
    case "vertical":
      q.title = `Re(z) = ${h}`;
      q.reference = [[point(h, -5), point(h, 5)]];
      q.explanation = `All points with real part ${h} form a vertical line.`;
      break;
    case "horizontal":
      q.title = `Im(z) = ${k}`;
      q.reference = [[point(-6, k), point(6, k)]];
      q.explanation = `All points with imaginary part ${k} form a horizontal line.`;
      break;
    case "bisector": {
      const p = point(h - a, k - b),
        s = point(h + a, k + b);
      q.title = `|z − ${ztext(p.x, p.y)}| = |z − ${ztext(s.x, s.y)}|`;
      q.reference = [
        [point(h - 10 * b, k + 10 * a), point(h + 10 * b, k - 10 * a)],
      ];
      q.explanation = `The perpendicular bisector passes through (${h}, ${k}) with direction (${b}, −${a}).`;
      break;
    }
    case "ray": {
      const j = integer(r, 1, 3),
        theta = (j * Math.PI) / 4;
      q.title = `arg(z − ${ztext(h, k)}) = ${j}π/4`;
      q.reference = [
        [
          point(h, k),
          point(h + 20 * Math.cos(theta), k + 20 * Math.sin(theta)),
        ],
      ];
      q.excluded = [point(h, k)];
      q.features.open = [point(h, k)];
      q.explanation = `A ray from (${h}, ${k}) at angle ${j}π/4. Exclude the starting point, where the argument is undefined.`;
      break;
    }
    case "halfplane":
      q.title = `Re(z) > ${h}`;
      q.reference = [[point(h, -5), point(h, 5)]];
      q.region = (p) => p.x > h;
      q.boundaryDashed = true;
      q.explanation = `Shade the half-plane to the right of x = ${h}, using a dashed boundary because the inequality is strict.`;
      break;
    case "ellipse": {
      const c = b,
        A = b + a,
        B = Math.sqrt(A * A - c * c);
      q.title = `|z − ${c}| + |z + ${c}| = ${2 * A}`;
      q.view = { xmin: -7, xmax: 7, ymin: -6, ymax: 6 };
      q.reference = [
        parametric(
          (t) => point(A * Math.cos(t), B * Math.sin(t)),
          0,
          2 * Math.PI,
        ),
      ];
      q.explanation = `Ellipse with foci ±${c}, semimajor axis ${A} and semiminor axis √${A * A - c * c}.`;
      break;
    }
    case "hyperbola":
      q.title = `Re(z²) = ${a}`;
      q.reference = [
        ...sampleFunction(
          (x) => (Math.abs(x) >= Math.sqrt(a) ? Math.sqrt(x * x - a) : NaN),
          q.view,
          [-Math.sqrt(a), Math.sqrt(a)],
        ),
        ...sampleFunction(
          (x) => (Math.abs(x) >= Math.sqrt(a) ? -Math.sqrt(x * x - a) : NaN),
          q.view,
          [-Math.sqrt(a), Math.sqrt(a)],
        ),
      ];
      q.explanation = `Writing z = x + iy gives x² − y² = ${a}: two hyperbola branches opening left and right.`;
      break;
    case "annulus":
      q.title = `${a} < |z| < ${a + 1}`;
      q.reference = [circle(0, 0, a), circle(0, 0, a + 1)];
      q.region = (p) =>
        p.x * p.x + p.y * p.y > a * a && p.x * p.x + p.y * p.y < (a + 1) ** 2;
      q.boundaryDashed = true;
      q.explanation = `Shade between the two concentric circles of radii ${a} and ${a + 1}. Both boundaries are excluded.`;
      break;
    case "sector": {
      const radius = a + 1;
      q.title = `0 < |z| ≤ ${radius}, 0 ≤ arg(z) ≤ π/2`;
      q.reference = [
        [point(0, 0), point(radius, 0)],
        parametric(
          (t) => point(radius * Math.cos(t), radius * Math.sin(t)),
          0,
          Math.PI / 2,
        ),
        [point(0, radius), point(0, 0)],
      ];
      q.region = (p) =>
        p.x >= 0 &&
        p.y >= 0 &&
        p.x * p.x + p.y * p.y <= radius * radius &&
        p.x * p.x + p.y * p.y > 0;
      q.excluded = [point(0, 0)];
      q.features.open = [point(0, 0)];
      q.explanation = `Shade the first-quadrant quarter-disk of radius ${radius}. Include the bounding rays and arc, but exclude the origin.`;
      break;
    }
    case "lens": {
      const radius = a + 1,
        c = radius / 2,
        theta = Math.acos(c / radius);
      q.title = `|z − ${c}| ≤ ${radius} and |z + ${c}| ≤ ${radius}`;
      q.reference = [
        parametric(
          (t) => point(-c + radius * Math.cos(t), radius * Math.sin(t)),
          -theta,
          theta,
        ),
        parametric(
          (t) => point(c + radius * Math.cos(t), radius * Math.sin(t)),
          Math.PI - theta,
          Math.PI + theta,
        ),
      ];
      q.region = (p) =>
        (p.x - c) ** 2 + p.y * p.y <= radius ** 2 &&
        (p.x + c) ** 2 + p.y * p.y <= radius ** 2;
      q.explanation =
        "Shade the intersection of the two disks. Only the two arcs bounding their overlap belong to the answer.";
      break;
    }
    case "squaremap":
      q.title = `Image of Re(z) = ${a} under w = z² (draw in the w-plane)`;
      q.reference = [parametric((t) => point(a * a - t * t, 2 * a * t), -8, 8)];
      q.detail = "The horizontal and vertical axes represent Re(w) and Im(w).";
      q.explanation = `Let z = ${a} + it. Then Re(w) = ${a * a} − t² and Im(w) = ${2 * a}t, a left-opening parabola with vertex (${a * a}, 0).`;
      break;
    default:
      throw new Error("Unsupported locus");
  }
  return q;
}
export function complexGame(seed: string, difficulty: Difficulty) {
  return shuffle(families[difficulty], random(seed))
    .slice(0, 5)
    .map((f, i) => complexQuestion(`${seed}-${i}`, difficulty, f));
}
export function customComplex(input: string, view: View): PlotQuestion {
  const s = input.replace(/\s/g, "").replace(/≤/g, "<=").replace(/≥/g, ">=");
  let q = complexQuestion("custom", "Easy", "circle");
  q = {
    ...q,
    id: `custom-${Date.now()}`,
    title: input,
    view,
    family: "custom locus",
  };
  const num = "(-?\\d+(?:\\.\\d+)?)";
  const circle = s.match(
    new RegExp(`^\\|z(?:-\\(${num}([+-])${num}i\\))?\\|(=|<=|<)${num}$`),
  );
  if (circle) {
    const h = circle[1] ? Number(circle[1]) : 0,
      k = circle[3] ? (circle[2] === "-" ? -1 : 1) * Number(circle[3]) : 0,
      op = circle[4],
      radius = Number(circle[5]);
    if (radius <= 0) throw new Error("The radius must be positive.");
    q.reference = [
      parametric(
        (t) => point(h + radius * Math.cos(t), k + radius * Math.sin(t)),
        0,
        2 * Math.PI,
      ),
    ];
    q.region =
      op === "="
        ? undefined
        : (p) => (p.x - h) ** 2 + (p.y - k) ** 2 < radius * radius;
    q.boundaryDashed = op === "<";
    q.explanation = `Centre (${h}, ${k}), radius ${radius}. ${op === "=" ? "Draw the circle." : "Shade its interior."}`;
    return q;
  }
  const line = s.match(new RegExp(`^(Re|Im)\\(z\\)(=|>|<|>=|<=)${num}$`));
  if (line) {
    const re = line[1] === "Re",
      op = line[2],
      c = Number(line[3]);
    q.reference = [
      re
        ? [point(c, view.ymin), point(c, view.ymax)]
        : [point(view.xmin, c), point(view.xmax, c)],
    ];
    q.region =
      op === "="
        ? undefined
        : (p) =>
            op.startsWith(">") ? (re ? p.x : p.y) > c : (re ? p.x : p.y) < c;
    q.boundaryDashed = op === "<" || op === ">";
    q.explanation = `${re ? "Vertical" : "Horizontal"} boundary at ${c}. ${op === "=" ? "Draw the full line." : `Shade the ${op.startsWith(">") ? "greater" : "lesser"} side.`}`;
    return q;
  }
  throw new Error(
    "Supported text formats: |z| <= 2, |z-(2+1i)| = 3, Re(z) > 1, Im(z) = -2. For other loci choose unmarked practice.",
  );
}
