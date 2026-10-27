import type { Item, Point, View } from "../types";
export const point = (x: number, y: number): Point => ({ x, y });
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const inside = (p: Point, v: View) =>
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= v.xmin &&
  p.x <= v.xmax &&
  p.y >= v.ymin &&
  p.y <= v.ymax;
export const toScreen = (p: Point, v: View, w: number, h: number) =>
  point(
    ((p.x - v.xmin) / (v.xmax - v.xmin)) * w,
    ((v.ymax - p.y) / (v.ymax - v.ymin)) * h,
  );
export const toMath = (p: Point, v: View, w: number, h: number) =>
  point(
    v.xmin + (p.x / w) * (v.xmax - v.xmin),
    v.ymax - (p.y / h) * (v.ymax - v.ymin),
  );
export function sampleFunction(
  fn: (x: number) => number,
  v: View,
  breaks: number[] = [],
  count = 900,
): Point[][] {
  const result: Point[][] = [];
  let branch: Point[] = [];
  let prevX = v.xmin;
  for (let i = 0; i <= count; i++) {
    const x = v.xmin + ((v.xmax - v.xmin) * i) / count,
      y = fn(x);
    const p = point(x, y);
    const split = breaks.some((b) => b >= prevX && b <= x);
    if (
      !Number.isFinite(y) ||
      split ||
      Math.abs(y) > 1e5 ||
      (branch.length > 0 &&
        Math.abs(y - branch[branch.length - 1].y) > (v.ymax - v.ymin) * 0.35)
    ) {
      if (branch.length > 1) result.push(branch);
      branch = [];
    }
    if (Number.isFinite(y) && Math.abs(y) < 1e5) branch.push(p);
    prevX = x;
  }
  if (branch.length > 1) result.push(branch);
  return result;
}
export function parametric(
  fn: (t: number) => Point,
  start: number,
  end: number,
  n = 600,
) {
  return Array.from({ length: n + 1 }, (_, i) =>
    fn(start + ((end - start) * i) / n),
  );
}
export function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return distance(p, point(a.x + t * dx, a.y + t * dy));
}
export function polygonContains(p: Point, poly: Point[]) {
  let result = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      result = !result;
  }
  return result;
}
export function itemPath(item: Item, v: View): Point[] {
  const [a, b] = item.points;
  if (!a) return [];
  if ((item.kind === "circle" || item.kind === "disk") && b) {
    const r = distance(a, b);
    return parametric(
      (t) => point(a.x + r * Math.cos(t), a.y + r * Math.sin(t)),
      0,
      2 * Math.PI,
      200,
    );
  }
  if ((item.kind === "line" || item.kind === "ray") && b) {
    const length = distance(a, b);
    if (length < 1e-8) return [];
    const span = (Math.hypot(v.xmax - v.xmin, v.ymax - v.ymin) * 5) / length;
    return [
      item.kind === "ray"
        ? a
        : point(a.x - (b.x - a.x) * span, a.y - (b.y - a.y) * span),
      point(a.x + (b.x - a.x) * span, a.y + (b.y - a.y) * span),
    ];
  }
  return item.points;
}
export function clipSegment(a: Point, b: Point): [Point, Point] | null {
  let lo = 0,
    hi = 1;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x],
    [dx, 1 - a.x],
    [-dy, a.y],
    [dy, 1 - a.y],
  ]) {
    if (Math.abs(p) < 1e-14) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [
    point(a.x + lo * dx, a.y + lo * dy),
    point(a.x + hi * dx, a.y + hi * dy),
  ];
}
export function resample(paths: Point[][], v: View, step = 0.009): Point[] {
  const out: Point[] = [];
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const normalized = (p: Point) =>
        point(
          (p.x - v.xmin) / (v.xmax - v.xmin),
          (p.y - v.ymin) / (v.ymax - v.ymin),
        );
      const clipped = clipSegment(normalized(path[i - 1]), normalized(path[i]));
      if (!clipped) continue;
      const [a, b] = clipped,
        n = Math.max(1, Math.ceil(distance(a, b) / step));
      for (let j = 0; j <= n; j++)
        out.push(
          point(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n),
        );
    }
  return out;
}
export function compareCurves(
  actual: Point[][],
  expected: Point[][],
  v: View,
  tolerance = 0.025,
) {
  const a = resample(actual, v),
    b = resample(expected, v);
  if (!a.length || !b.length) return 0;
  const nearest = (p: Point, pts: Point[]) =>
    Math.min(...pts.map((q) => distance(p, q)));
  const quality = (x: Point[], y: Point[]) =>
    x.reduce(
      (sum, p) => sum + Math.exp(-0.5 * (nearest(p, y) / tolerance) ** 2),
      0,
    ) / x.length;
  const precision = quality(a, b),
    recall = quality(b, a);
  return (2 * precision * recall) / (precision + recall || 1);
}
export const normalizedDistance = (a: Point, b: Point, v: View) =>
  Math.hypot((a.x - b.x) / (v.xmax - v.xmin), (a.y - b.y) / (v.ymax - v.ymin));
