export const PROPERTY_ALIASES: Record<string, string[]> = {
  even: [
    "even",
    "even function",
    "symmetric about the y axis",
    "symmetric about y axis",
    "y axis symmetry",
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
};

export function normalizePropertyText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.]+$/, "")
    .replace(/π/g, "pi")
    .replace(/≥/g, ">=")
    .replace(/−/g, "-")
    .replace(/y-axis/g, "y axis")
    .replace(/x-axis/g, "x axis")
    .replace(/\s+/g, " ");
}

/** Shared canonical vocabulary for tag selection and legacy text answers. */
export function parsePropertyClaim(raw: string) {
  let text = normalizePropertyText(raw),
    negative = false;
  if (text.startsWith("not ")) {
    negative = true;
    text = text.slice(4);
  }
  let key = Object.entries(PROPERTY_ALIASES).find(([, values]) =>
    values.includes(text),
  )?.[0];
  const period = text.match(
    /^(?:periodic with )?period\s*(?:=|:|of)?\s*(\d+(?:\.\d+)?)?\s*(pi)?\s*(?:\/\s*(\d+))?$/,
  );
  let periodValue: number | undefined;
  if (period) {
    periodValue =
      (Number(period[1] || 1) * (period[2] ? Math.PI : 1)) /
      Number(period[3] || 1);
    if (!Number.isFinite(periodValue) || periodValue <= 0) return null;
    key = "period";
  }
  if (!key) return null;
  if (key.startsWith("unbounded")) {
    key = key.replace("unbounded", "bounded");
    negative = !negative;
  }
  const scope = text.endsWith("everywhere") ? "everywhere" : "domain";
  return {
    key,
    negative,
    periodValue,
    scope,
    identity: `${key}:${negative}:${scope}:${periodValue ?? ""}`,
  };
}

export interface PropertyTag {
  id: string;
  label: string;
  claim: string;
  description: string;
  keywords: string[];
}

function tag(
  id: string,
  label: string,
  claim: string,
  description: string,
  key = id,
  extra: string[] = [],
): PropertyTag {
  return {
    id,
    label,
    claim,
    description,
    keywords: [
      ...(PROPERTY_ALIASES[key] || []).filter(
        (alias) =>
          !(key === "continuous" || key === "differentiable") ||
          alias.endsWith("everywhere") === claim.endsWith("everywhere"),
      ),
      ...extra,
    ],
  };
}

/** Same catalogue for every question. Never filter suggestions by its answer. */
export const PROPERTY_TAGS: PropertyTag[] = [
  tag(
    "even",
    "Even / y-axis symmetry",
    "even function",
    "Reflection in the y-axis leaves the graph unchanged.",
  ),
  tag(
    "odd",
    "Odd / origin symmetry",
    "odd function",
    "A half-turn about the origin leaves the graph unchanged.",
  ),
  tag(
    "continuous",
    "Continuous on its domain",
    "continuous on its domain",
    "Continuous at every point in its stated domain.",
  ),
  tag(
    "differentiable",
    "Differentiable on its domain",
    "differentiable on its domain",
    "Has a derivative throughout its stated domain.",
  ),
  tag(
    "continuous-everywhere",
    "Continuous for all real x",
    "continuous everywhere",
    "Defined and continuous at every real x.",
    "continuous",
    ["everywhere continuous"],
  ),
  tag(
    "differentiable-everywhere",
    "Differentiable for all real x",
    "differentiable everywhere",
    "Defined and differentiable at every real x.",
    "differentiable",
    ["everywhere differentiable"],
  ),
  tag(
    "increasing",
    "Strictly increasing",
    "strictly increasing",
    "Larger inputs give strictly larger outputs throughout the domain.",
  ),
  tag(
    "decreasing",
    "Strictly decreasing",
    "strictly decreasing",
    "Larger inputs give strictly smaller outputs throughout the domain.",
  ),
  tag(
    "injective",
    "Injective (one-to-one)",
    "injective",
    "Distinct inputs give distinct outputs.",
  ),
  tag(
    "bounded below",
    "Bounded below",
    "bounded below",
    "There is a finite lower bound for y.",
  ),
  tag(
    "bounded above",
    "Bounded above",
    "bounded above",
    "There is a finite upper bound for y.",
  ),
  tag(
    "bounded",
    "Bounded",
    "bounded",
    "There are finite bounds both above and below.",
  ),
  tag(
    "unbounded above",
    "Unbounded above",
    "unbounded above",
    "There is no finite upper bound for y.",
  ),
  tag(
    "unbounded below",
    "Unbounded below",
    "unbounded below",
    "There is no finite lower bound for y.",
  ),
  tag(
    "unbounded",
    "Unbounded",
    "unbounded",
    "At least one of the upper and lower bounds does not exist.",
  ),
  tag(
    "positive",
    "Strictly positive",
    "positive",
    "Every output is greater than zero.",
  ),
  tag(
    "nonnegative",
    "Nonnegative (y ≥ 0)",
    "nonnegative",
    "Every output is at least zero.",
  ),
  tag(
    "periodic",
    "Periodic",
    "periodic",
    "The graph repeats with a positive period.",
  ),
  tag(
    "inflection at zero",
    "Inflection at x = 0",
    "inflection at zero",
    "The curve changes concavity at x = 0.",
  ),
  tag(
    "x-axis symmetry",
    "X-axis symmetry",
    "symmetric about the x axis",
    "Reflection in the x-axis leaves the locus unchanged.",
  ),
  tag(
    "not differentiable",
    "Not differentiable throughout its domain",
    "not differentiable on its domain",
    "The derivative fails to exist somewhere on the stated domain.",
    "not differentiable",
    ["corner", "cusp", "not differentiable"],
  ),
  tag(
    "not injective",
    "Not injective",
    "not injective",
    "At least two distinct inputs give the same output.",
    "not injective",
    ["not one to one", "not one-to-one"],
  ),
  ...[
    ["period-2pi", "2π", "2pi"],
    ["period-pi", "π", "pi"],
    ["period-2pi-3", "2π/3", "2pi/3"],
    ["period-pi-2", "π/2", "pi/2"],
    ["period-4pi", "4π", "4pi"],
  ].map(([id, label, value]) =>
    tag(
      id,
      `Fundamental period ${label}`,
      `period = ${value}`,
      `The smallest positive period is ${label}.`,
      "period",
      [`period ${label}`, `period ${value}`, `periodic ${value}`],
    ),
  ),
];

const tagById = new Map(PROPERTY_TAGS.map((t) => [t.id, t]));
export function getPropertyTag(id: string) {
  return tagById.get(id);
}
const searchText = (text: string) =>
  normalizePropertyText(text)
    .replace(/[-()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export function searchPropertyTags(
  query: string,
  selectedIds: string[] = [],
): PropertyTag[] {
  const normalized = searchText(query),
    tokens = normalized.split(" ").filter(Boolean),
    selected = new Set(selectedIds);
  return PROPERTY_TAGS.map((tag, index) => {
    const terms = [tag.label, tag.claim, ...tag.keywords].map(searchText);
    const score = !normalized
      ? 3
      : terms.some((t) => t === normalized)
        ? 0
        : terms.some((t) => t.startsWith(normalized))
          ? 1
          : terms.some(
                (t) =>
                  tokens.every((token) => t.includes(token)) ||
                  t
                    .replaceAll(" ", "")
                    .includes(normalized.replaceAll(" ", "")),
              )
            ? 2
            : Infinity;
    return { tag, index, score };
  })
    .filter(({ tag, score }) => !selected.has(tag.id) && Number.isFinite(score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ tag }) => tag);
}

export function serializePropertyTags(ids: string[]): string {
  return [...new Set(ids)]
    .map((id) => tagById.get(id)?.claim)
    .filter((claim): claim is string => !!claim)
    .join("; ");
}
