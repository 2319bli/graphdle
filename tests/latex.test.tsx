import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { FUNCTION_FAMILIES, functionQuestion } from "../src/math/functions";
import { complexQuestion, customComplex } from "../src/math/complex";
import { customFunction } from "../src/math/customFunction";
import { trigQuestion } from "../src/math/trigonometry";
import { TRIG_NAMES, TRIG_ALIASES } from "../src/math/trigFunctions";
import {
  MathFormula,
  QuestionDetail,
  QuestionEquation,
} from "../src/components/MathFormula";
import { DEFAULT_VIEW, type Difficulty, type PlotQuestion } from "../src/types";

const render = (latex: string) =>
  katex.renderToString(latex, {
    throwOnError: true,
    strict: "error",
    trust: false,
    output: "htmlAndMathml",
  });
function verifyQuestion(q: PlotQuestion) {
  expect(q.latex, q.title).toBeTruthy();
  expect(render(q.latex!), q.title).toContain("<math");
  for (const part of q.detailParts || []) {
    if (typeof part !== "string") expect(render(part.latex)).toContain("<math");
  }
}

describe("typeset question equations", () => {
  it("renders every generated function and complex template without LaTeX errors", () => {
    for (const [level, families] of Object.entries(FUNCTION_FAMILIES))
      for (const family of families)
        for (let i = 0; i < 3; i++)
          verifyQuestion(
            functionQuestion(`latex-${i}`, level as Difficulty, family),
          );
    for (const family of [
      "circle",
      "point",
      "disk",
      "line",
      "vertical",
      "horizontal",
      "bisector",
      "ray",
      "halfplane",
      "ellipse",
      "hyperbola",
      "annulus",
      "sector",
      "lens",
      "squaremap",
    ])
      for (let i = 0; i < 3; i++)
        verifyQuestion(complexQuestion(`latex-${i}`, "Expert", family));
  });
  it("uses stacked fractions, true superscripts, and piecewise rows", () => {
    expect(
      render(functionQuestion("fraction", "Hard", "logratio").latex!),
    ).toContain("<mfrac>");
    expect(
      render(functionQuestion("power", "Easy", "exponential").latex!),
    ).toContain("<msup>");
    expect(
      render(functionQuestion("pieces", "Medium", "piecewise").latex!),
    ).toContain("<mtable");
    expect(functionQuestion("pieces", "Medium", "piecewise").latex).toContain(
      "\\begin{cases}",
    );
  });
  it("preserves nested custom-expression grouping instead of replacing slash characters", () => {
    const q = customFunction("(x+1)/(x^2+3) + exp(-x/2)", DEFAULT_VIEW);
    expect(q.title).toBe("y = (x+1)/(x^2+3) + exp(-x/2)");
    const html = render(q.latex!);
    expect((html.match(/<mfrac>/g) || []).length).toBe(2);
    expect(html).toContain("<msup>");
    expect(q.latex).toContain("\\frac");
    expect(q.latex).not.toContain("/");
    expect(q.curveOnly).toBe(true);
  });
  it("formats all custom trig names consistently and keeps inverse arguments fractional", () => {
    for (const name of [...TRIG_NAMES, ...Object.keys(TRIG_ALIASES)])
      verifyQuestion(customFunction(`${name}(x/2)`, DEFAULT_VIEW));
    const q = customFunction("arctanh(x/3)", DEFAULT_VIEW);
    expect(q.latex).toContain("\\operatorname{arctanh}");
    expect(render(q.latex!)).toContain("<mfrac>");
    expect(q.latex).not.toContain("^{-1}");
  });
  it("renders fractional domains and principal ranges alongside readable text", () => {
    const tan = trigQuestion("domain", "tan", 2, 3);
    const html = renderToStaticMarkup(<QuestionDetail question={tan} />);
    expect(html).toContain("Angles in radians.");
    expect(html).toContain("Domain:");
    expect(html).toContain("<mfrac>");
    const asin = trigQuestion("range", "asin", 3, 2);
    expect(renderToStaticMarkup(<QuestionDetail question={asin} />)).toContain(
      "Principal range:",
    );
    expect(render(asin.latex!)).toContain("<mfrac>");
  });
  it("uses the actual custom complex equation rather than an inherited template", () => {
    const q = customComplex("Im(z) >= -2", DEFAULT_VIEW);
    expect(q.latex).toBe("\\operatorname{Im}(z) \\ge -2");
    verifyQuestion(q);
    verifyQuestion(customComplex("|z-(2+1i)| <= 3", DEFAULT_VIEW));
  });
  it("renders MathML in both review and compact results, with safe plain-text fallbacks", () => {
    const q = functionQuestion("a11y", "Easy", "reciprocal");
    expect(renderToStaticMarkup(<QuestionEquation question={q} />)).toContain(
      "math-display",
    );
    const compact = renderToStaticMarkup(
      <QuestionEquation question={q} compact />,
    );
    expect(compact).toContain("math-inline");
    expect(compact).toContain("<mfrac>");
    const fallback = renderToStaticMarkup(
      <MathFormula
        latex={"\\notARealCommand"}
        fallback="<img src=x onerror=alert(1)>"
      />,
    );
    expect(fallback).not.toContain("<img");
    expect(fallback).toContain("&lt;img");
    expect(
      renderToStaticMarkup(
        <MathFormula fallback="A free-form practice prompt" />,
      ),
    ).toBe("A free-form practice prompt");
  });
});
