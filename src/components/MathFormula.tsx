import { useMemo } from "react";
import katex from "katex";
import type { Question } from "../types";

export function MathFormula({
  latex,
  fallback,
  display = false,
}: {
  latex?: string;
  fallback: string;
  display?: boolean;
}) {
  const html = useMemo(() => {
    if (!latex) return null;
    try {
      return katex.renderToString(display ? latex : `\\displaystyle ${latex}`, {
        displayMode: display,
        output: "htmlAndMathml",
        throwOnError: true,
        trust: false,
        strict: "error",
        maxExpand: 1000,
        maxSize: 20,
      });
    } catch {
      return null;
    }
  }, [latex, display]);
  // Only KaTeX-generated markup enters HTML; arbitrary practice prompts stay text.
  return html ? (
    <span
      className={`math-formula ${display ? "math-display" : "math-inline"}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <>{fallback}</>
  );
}

export function QuestionEquation({
  question,
  compact = false,
}: {
  question: Question;
  compact?: boolean;
}) {
  return (
    <MathFormula
      latex={question.mode === "network" ? undefined : question.latex}
      fallback={question.title}
      display={!compact}
    />
  );
}

export function QuestionDetail({ question }: { question: Question }) {
  if (question.mode === "network" || !question.detailParts)
    return <p>{question.detail}</p>;
  return (
    <p className="math-details">
      {question.detailParts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <span className="math-detail-part" key={i}>
            <span>{part.label}: </span>
            <MathFormula latex={part.latex} fallback={question.detail} />
          </span>
        ),
      )}
    </p>
  );
}
