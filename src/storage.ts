import type { HistoryEntry } from "./types";
const KEY = "graphdle.history.v1";
export function readHistory(
  storage: Pick<Storage, "getItem"> = localStorage,
): HistoryEntry[] {
  try {
    const data = JSON.parse(storage.getItem(KEY) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (x) =>
            x &&
            typeof x.id === "string" &&
            ["function", "network", "complex"].includes(x.mode) &&
            Number.isFinite(x.score) &&
            Array.isArray(x.questions) &&
            x.questions.every(
              (q: unknown) =>
                q !== null &&
                typeof q === "object" &&
                typeof (q as { family?: unknown }).family === "string" &&
                typeof (q as { title?: unknown }).title === "string" &&
                Number.isFinite((q as { score?: unknown }).score),
            ) &&
            typeof x.date === "string" &&
            Number.isFinite(Date.parse(x.date)) &&
            ["Easy", "Medium", "Hard", "Expert"].includes(x.difficulty),
        )
      : [];
  } catch {
    return [];
  }
}
export function saveHistory(
  entries: HistoryEntry[],
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  try {
    storage.setItem(KEY, JSON.stringify(entries.slice(-200)));
    return true;
  } catch {
    return false;
  }
}
export function getTheme() {
  try {
    return localStorage.getItem("graphdle.theme") || "light";
  } catch {
    return "light";
  }
}
