import { TRIG_ALIASES, isTrigName } from "./trigFunctions";

export const tex = String.raw;
export const signedTerm = (value: number) =>
  value < 0 ? `- ${-value}` : `+ ${value}`;

export function trigOperator(name: string) {
  const canonical = TRIG_ALIASES[name] || name;
  if (!isTrigName(canonical)) throw new Error("Unknown trig function");
  return tex`\operatorname{${canonical.startsWith("a") ? `arc${canonical.slice(1)}` : canonical}}`;
}

/** Only the fixed grammar used in generated domain/range annotations. */
export function relationLatex(text: string) {
  return text
    .replace(
      /\(π\/2 \+ nπ\)\/(\d+)/g,
      (_, d: string) => tex`\frac{\frac{π}{2}+nπ}{${d}}`,
    )
    .replace(/nπ\/(\d+)/g, (_, d: string) => tex`\frac{nπ}{${d}}`)
    .replace(
      /(\d*)π\/(\d+)/g,
      (_, n: string, d: string) => tex`\frac{${n}π}{${d}}`,
    )
    .replace(/π/g, tex`\pi `)
    .replace(/−/g, "-")
    .replace(/≠/g, tex`\ne `)
    .replace(/≤/g, tex`\le `)
    .replace(/≥/g, tex`\ge `)
    .replace(/∈/g, tex`\in `)
    .replace(/ℝ/g, tex`\mathbb{R}`)
    .replace(/ℤ/g, tex`\mathbb{Z}`)
    .replace(/ or /g, tex`\quad\text{or}\quad `);
}
