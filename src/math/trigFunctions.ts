/** Real-valued functions shared by generated questions and custom expressions. */
export const TRIG_NAMES = [
  "sin",
  "cos",
  "tan",
  "sec",
  "csc",
  "cot",
  "asin",
  "acos",
  "atan",
  "asec",
  "acsc",
  "acot",
  "sinh",
  "cosh",
  "tanh",
  "sech",
  "csch",
  "coth",
  "asinh",
  "acosh",
  "atanh",
  "asech",
  "acsch",
  "acoth",
] as const;
export type TrigName = (typeof TRIG_NAMES)[number];

const reciprocal = (x: number) => (Math.abs(x) < 1e-12 ? NaN : 1 / x);
export const REAL_TRIG: Record<TrigName, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: (x) => Math.sin(x) * reciprocal(Math.cos(x)),
  sec: (x) => reciprocal(Math.cos(x)),
  csc: (x) => reciprocal(Math.sin(x)),
  cot: (x) => Math.cos(x) * reciprocal(Math.sin(x)),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  asec: (x) => (Math.abs(x) >= 1 ? Math.acos(1 / x) : NaN),
  acsc: (x) => (Math.abs(x) >= 1 ? Math.asin(1 / x) : NaN),
  // Explicit real convention: range (0, pi), including acot(0) = pi/2.
  acot: (x) => Math.atan2(1, x),
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sech: (x) => 1 / Math.cosh(x),
  csch: (x) => (x === 0 ? NaN : 1 / Math.sinh(x)),
  coth: (x) => (x === 0 ? NaN : 1 / Math.tanh(x)),
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: (x) => (Math.abs(x) < 1 ? Math.atanh(x) : NaN),
  asech: (x) => (x > 0 && x <= 1 ? Math.acosh(1 / x) : NaN),
  acsch: (x) => (x === 0 ? NaN : Math.asinh(1 / x)),
  acoth: (x) => (Math.abs(x) > 1 ? Math.atanh(1 / x) : NaN),
};

export const TRIG_ALIASES: Record<string, TrigName> = {
  cosec: "csc",
  cosech: "csch",
  arcsin: "asin",
  arccos: "acos",
  arctan: "atan",
  arcsec: "asec",
  arccsc: "acsc",
  arccosec: "acsc",
  arccot: "acot",
  arcsinh: "asinh",
  arccosh: "acosh",
  arctanh: "atanh",
  arcsech: "asech",
  arccsch: "acsch",
  arccosech: "acsch",
  arccoth: "acoth",
};
export const REAL_TRIG_SCOPE = {
  ...REAL_TRIG,
  ...Object.fromEntries(
    Object.entries(TRIG_ALIASES).map(([alias, name]) => [
      alias,
      REAL_TRIG[name],
    ]),
  ),
};
export function isTrigName(name: string): name is TrigName {
  return Object.hasOwn(REAL_TRIG, name);
}
