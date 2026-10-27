import type { Point, TurningPoint, View } from "../types";
import { normalizedDistance, point } from "./geometry";

export const TURN_SKETCH_TOLERANCE = {
  position: 0.045,
  fullPosition: 0.0125,
  shape: 0.025,
  fullShape: 0.9,
  supportWidth: 0.06,
  minimumRise: 0.006,
  requiredCoverage: 0.8,
};

export function isSketchTurningPoint(feature: TurningPoint) {
  return feature.kind === "corner" || feature.kind === "cusp";
}

type Segment = [Point, Point];
function segments(paths: Point[][]): Segment[] {
  return paths
    .flatMap((path) => path.slice(1).map((p, i): Segment => [path[i], p]))
    .filter(
      ([a, b]) =>
        [a.x, a.y, b.x, b.y].every(Number.isFinite) &&
        (a.x !== b.x || a.y !== b.y),
    );
}

/** Interpolate segments, not input sample density or screen pixels. */
function valuesAtX(lines: Segment[], x: number): number[] {
  const values: number[] = [];
  for (const [a, b] of lines) {
    if (x < Math.min(a.x, b.x) - 1e-10 || x > Math.max(a.x, b.x) + 1e-10)
      continue;
    if (Math.abs(b.x - a.x) < 1e-12) values.push(a.y, b.y);
    else values.push(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
  }
  return values;
}
function closest(values: number[], target: number) {
  return values.reduce<number | undefined>(
    (best, value) =>
      best === undefined || Math.abs(value - target) < Math.abs(best - target)
        ? value
        : best,
    undefined,
  );
}

/**
 * Recognise an expected sharp extremum using local sketch geometry. Both sides
 * must extend away from a nearby vertex in the correct vertical direction and
 * follow the local reference. A single branch or a line crossing the vertex
 * cannot satisfy this. Tiny pen-lift gaps and freehand noise are tolerated.
 * All distances are relative to the original assessment window.
 */
export function cornerSketchQuality(
  paths: Point[][],
  reference: Point[][],
  feature: TurningPoint,
  view: View,
): number {
  if (!isSketchTurningPoint(feature) || !feature.extremum) return 0;
  const lines = segments(paths),
    expected = segments(reference);
  if (!lines.length || !expected.length) return 0;
  const width = view.xmax - view.xmin,
    height = view.ymax - view.ymin;
  const direction = feature.extremum === "minimum" ? 1 : -1;
  const tolerance = TURN_SKETCH_TOLERANCE;
  const candidates: Point[] = [];
  // Include vertices and projections onto segments so sparse/reversed strokes
  // are treated identically to densely sampled strokes.
  for (const [a, b] of lines) {
    candidates.push(a, b);
    const dx = (b.x - a.x) / width,
      dy = (b.y - a.y) / height;
    const t = Math.max(
      0,
      Math.min(
        1,
        (((feature.x - a.x) / width) * dx + ((feature.y - a.y) / height) * dy) /
          (dx * dx + dy * dy),
      ),
    );
    candidates.push(point(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)));
  }
  let best = 0;
  for (const vertex of candidates) {
    const locationError = normalizedDistance(vertex, feature, view);
    if (locationError >= tolerance.position) continue;
    const locationQuality = Math.min(
      1,
      (tolerance.position - locationError) /
        (tolerance.position - tolerance.fullPosition),
    );
    if (locationQuality <= best) continue;
    const sides: number[] = [];
    for (const side of [-1, 1]) {
      let covered = 0,
        similarity = 0,
        farRise = 0,
        referenceRise = 0;
      for (let step = 1; step <= 5; step++) {
        const x = vertex.x + (side * tolerance.supportWidth * width * step) / 5;
        const referenceY = closest(valuesAtX(expected, x), feature.y);
        if (referenceY === undefined) continue;
        const y = closest(valuesAtX(lines, x), referenceY);
        if (y === undefined) continue;
        const rise = (direction * (y - vertex.y)) / height;
        // Allow small hand jitter around the vertex, but not a branch heading
        // through it in the wrong direction.
        if (rise < -tolerance.minimumRise) continue;
        covered++;
        similarity += Math.exp(
          -0.5 * ((y - referenceY) / height / tolerance.shape) ** 2,
        );
        if (step === 5) {
          farRise = rise;
          referenceRise = (direction * (referenceY - feature.y)) / height;
        }
      }
      if (
        covered / 5 < tolerance.requiredCoverage ||
        farRise < Math.max(tolerance.minimumRise, referenceRise * 0.25)
      ) {
        sides.push(0);
      } else sides.push(similarity / 5);
    }
    if (Math.min(...sides) < 0.6) continue;
    // Local shape is evidence of the extremum, while artistic accuracy already
    // has its own curve score. Give full feature credit for close freehand fits.
    const quality =
      locationQuality * Math.min(1, Math.min(...sides) / tolerance.fullShape);
    best = Math.max(best, quality >= 0.9 ? 1 : quality);
    if (best === 1) break;
  }
  return best;
}
