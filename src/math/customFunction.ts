import { parse } from "mathjs";
import { emptyFeatures, type PlotQuestion, type View } from "../types";
import { inside, sampleFunction } from "./geometry";
import { REAL_TRIG_SCOPE } from "./trigFunctions";
export function customFunction(
  expression: string,
  view: View,
  domain?: [number, number],
): PlotQuestion {
  const clean = expression.trim().replace(/^y\s*=\s*/i, "");
  if (clean.length > 250)
    throw new Error("Please keep expressions under 250 characters.");
  const node = parse(clean);
  let count = 0;
  const allowed = [
    ...Object.keys(REAL_TRIG_SCOPE),
    "exp",
    "log",
    "ln",
    "sqrt",
    "abs",
  ];
  node.traverse((n) => {
    count++;
    if (count > 100) throw new Error("Expression is too complex.");
    if (
      n.type === "SymbolNode" &&
      !["x", "e", "pi", ...allowed].includes((n as any).name)
    )
      throw new Error("Only x, e, pi and the listed functions are supported.");
    if (n.type === "FunctionNode" && !allowed.includes((n as any).fn.name))
      throw new Error("Unsupported function.");
    if (
      ![
        "OperatorNode",
        "ConstantNode",
        "SymbolNode",
        "FunctionNode",
        "ParenthesisNode",
      ].includes(n.type)
    )
      throw new Error("Use a single explicit expression in x.");
    if (
      n.type === "OperatorNode" &&
      !["+", "-", "*", "/", "^"].includes((n as any).op)
    )
      throw new Error("Unsupported operator.");
  });
  const compiled = node.compile();
  const fn = (x: number) => {
    if (domain && (x < domain[0] || x > domain[1])) return NaN;
    try {
      const y = compiled.evaluate({ x, ln: Math.log, ...REAL_TRIG_SCOPE });
      return typeof y === "number" && Number.isFinite(y) ? y : NaN;
    } catch {
      return NaN;
    }
  };
  const reference = sampleFunction(fn, view);
  if (!reference.some((path) => path.some((p) => inside(p, view))))
    throw new Error(
      "No real curve was found in this window. Adjust the expression or ranges.",
    );
  return {
    mode: "function",
    id: `custom-${Date.now()}`,
    family: "custom expression",
    title: `y = ${clean}`,
    detail:
      "Numerical curve-only marking. Features and written properties are not automatically verified for custom expressions.",
    view,
    reference,
    features: emptyFeatures(),
    properties: [],
    curveOnly: true,
    explanation:
      "This custom expression is sampled numerically. Singularities finer than the sampling resolution and highly oscillatory curves may be missed. Use practice mode for these cases.",
  };
}
