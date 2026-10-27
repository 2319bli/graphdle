import { describe, it, expect } from "vitest";
import {
  PROPERTY_TAGS,
  searchPropertyTags,
  serializePropertyTags,
  parsePropertyClaim,
} from "../src/math/propertyTags";
import { evaluateProperties } from "../src/math/grading";
import { functionQuestion } from "../src/math/functions";

describe("searchable property tags", () => {
  it("finds canonical tags from common equivalent wording", () => {
    expect(searchPropertyTags("no upper bound")[0].id).toBe("unbounded above");
    expect(searchPropertyTags("one-to-one")[0].id).toBe("injective");
    expect(searchPropertyTags("symmetric about the y-axis")[0].id).toBe("even");
    expect(searchPropertyTags("y >= 0")[0].id).toBe("nonnegative");
    expect(searchPropertyTags("period 2pi/3")[0].id).toBe("period-2pi-3");
  });
  it("only returns known tags, with unique semantic identities", () => {
    expect(new Set(PROPERTY_TAGS.map((t) => t.id)).size).toBe(
      PROPERTY_TAGS.length,
    );
    const parsed = PROPERTY_TAGS.map((t) => parsePropertyClaim(t.claim));
    expect(parsed.every(Boolean)).toBe(true);
    expect(new Set(parsed.map((p) => p!.identity)).size).toBe(
      PROPERTY_TAGS.length,
    );
    expect(searchPropertyTags("this is a lovely graph")).toEqual([]);
    expect(searchPropertyTags("")).toEqual(PROPERTY_TAGS);
  });
  it("excludes selected tags without changing the public catalogue", () => {
    const all = searchPropertyTags("bound");
    const remaining = searchPropertyTags("bound", [
      "bounded above",
      "unbounded above",
    ]);
    expect(remaining.map((t) => t.id)).toEqual(
      all
        .filter((t) => !["bounded above", "unbounded above"].includes(t.id))
        .map((t) => t.id),
    );
    expect(searchPropertyTags("bound")).toEqual(all);
  });
  it("submits only selected canonical claims, never arbitrary search text", () => {
    expect(
      serializePropertyTags([
        "even",
        "unbounded above",
        "even",
        "arbitrary text",
      ]),
    ).toBe("even function; unbounded above");
    expect(serializePropertyTags([])).toBe("");
    const q = {
      ...functionQuestion("tag-test", "Medium", "modulus"),
      properties: ["even", "bounded below"],
    };
    const evaluated = evaluateProperties(
      serializePropertyTags(["even", "unbounded above"]),
      q,
    );
    expect(evaluated.quality).toBe(1);
    expect(evaluated.claims.map((c) => c.status)).toEqual([
      "correct",
      "correct",
    ]);
  });
  it("keeps domain-scoped and everywhere claims distinct", () => {
    const q = functionQuestion("scope", "Medium", "rational");
    const tags = serializePropertyTags([
      "differentiable",
      "differentiable-everywhere",
    ]);
    expect(evaluateProperties(tags, q).claims.map((c) => c.status)).toEqual([
      "correct",
      "incorrect",
    ]);
    expect(searchPropertyTags("differentiable everywhere")[0].id).toBe(
      "differentiable-everywhere",
    );
  });
  it("does not hide contradictory period selections as duplicates", () => {
    const q = functionQuestion("period", "Easy", "sine");
    const result = evaluateProperties(
      serializePropertyTags(["period-2pi", "period-pi"]),
      q,
    );
    expect(result.claims.map((c) => c.status)).toEqual([
      "correct",
      "incorrect",
    ]);
    expect(result.quality).toBe(0);
    expect(parsePropertyClaim("period = 0")).toBeNull();
    expect(parsePropertyClaim("period = 2pi/0")).toBeNull();
  });
});
