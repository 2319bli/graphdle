import type { Difficulty, Network, NetworkQuestion } from "../types";
import { integer, random, shuffle } from "./random";
export const edgeKey = (a: string, b: string) => [a, b].sort().join("|");
export function network(n: number, edges: [number, number][]): Network {
  return {
    vertices: Array.from({ length: n }, (_, i) => ({
      id: String(i),
      label: String.fromCharCode(65 + i),
      x: 350 + 220 * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
      y: 240 + 170 * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
    })),
    edges: edges.map(([a, b]) => [String(a), String(b)]),
  };
}
export function degreeSequence(g: Network) {
  return g.vertices
    .map((v) => g.edges.filter((e) => e.includes(v.id)).length)
    .sort((a, b) => b - a);
}
export function components(g: Network) {
  const unseen = new Set(g.vertices.map((v) => v.id));
  let count = 0;
  while (unseen.size) {
    count++;
    const stack = [unseen.values().next().value!];
    while (stack.length) {
      const id = stack.pop()!;
      if (!unseen.delete(id)) continue;
      for (const [a, b] of g.edges) {
        if (a === id && unseen.has(b)) stack.push(b);
        if (b === id && unseen.has(a)) stack.push(a);
      }
    }
  }
  return count;
}
export function bipartite(g: Network) {
  const colours = new Map<string, number>();
  for (const v of g.vertices) {
    if (colours.has(v.id)) continue;
    colours.set(v.id, 0);
    const stack = [v.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const [a, b] of g.edges) {
        const next = a === id ? b : b === id ? a : null;
        if (next === null) continue;
        if (colours.get(next) === colours.get(id)) return false;
        if (!colours.has(next)) {
          colours.set(next, 1 - colours.get(id)!);
          stack.push(next);
        }
      }
    }
  }
  return true;
}
export const isSimple = (g: Network) =>
  new Set(g.vertices.map((v) => v.id)).size === g.vertices.length &&
  new Set(g.edges.map((e) => edgeKey(...e))).size === g.edges.length &&
  g.edges.every(
    ([a, b]) =>
      a !== b &&
      g.vertices.some((v) => v.id === a) &&
      g.vertices.some((v) => v.id === b),
  );
export function networkQuestion(
  seed: string,
  difficulty: Difficulty,
  index = 0,
): NetworkQuestion {
  const r = random(seed),
    level = ["Easy", "Medium", "Hard", "Expert"].indexOf(difficulty),
    n = integer(r, 4 + level, 5 + level);
  const edges: [number, number][] = [];
  let constraint: NetworkQuestion["constraint"] = "labelled";
  let format: NetworkQuestion["format"] = "matrix";
  const options: NetworkQuestion["constraint"][][] = [
    ["labelled", "labelled", "degrees", "tree", "complete"],
    ["labelled", "degrees", "unicyclic", "tree", "labelled"],
    ["degrees", "unicyclic", "bipartite", "labelled", "regular"],
    ["regular", "bipartite", "degrees", "unicyclic", "labelled"],
  ];
  constraint = options[level][index % 5];
  if (constraint === "tree" || constraint === "unicyclic") {
    for (let i = 1; i < n; i++) edges.push([i, integer(r, 0, i - 1)]);
    if (constraint === "unicyclic") {
      const choices: [number, number][] = [];
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          if (
            !edges.some(
              ([a, b]) =>
                edgeKey(String(a), String(b)) === edgeKey(String(i), String(j)),
            )
          )
            choices.push([i, j]);
      edges.push(choices[integer(r, 0, choices.length - 1)]);
    }
  } else if (constraint === "regular") {
    for (let i = 0; i < n; i++) edges.push([i, (i + 1) % n]);
    if (n % 2 === 0 && level === 3)
      for (let i = 0; i < n / 2; i++) edges.push([i, i + n / 2]);
  } else if (constraint === "bipartite") {
    const cut = Math.floor(n / 2);
    for (let i = 1; i < cut; i++) edges.push([i, cut]);
    for (let j = cut; j < n; j++) edges.push([0, j]);
    for (let i = 1; i < cut; i++)
      for (let j = cut + 1; j < n; j++) if (r() < 0.4) edges.push([i, j]);
  } else
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (constraint === "complete" || r() < 0.35 + level * 0.08)
          edges.push([i, j]);
  const answer = network(n, edges),
    degrees = degreeSequence(answer);
  let title = "",
    detail =
      "Simple, undirected graph. Vertex positions do not affect your score.";
  if (constraint === "labelled") {
    format = (["matrix", "list", "edges"] as const)[integer(r, 0, 2)];
    title = `Construct the graph from this ${format === "matrix" ? "adjacency matrix" : format === "list" ? "adjacency list" : "edge list"}.`;
    detail += " Match the given vertex labels exactly.";
  }
  if (constraint === "degrees")
    title = `Construct a graph with degree sequence (${degrees.join(", ")}).`;
  if (constraint === "tree") title = `Construct a tree on ${n} vertices.`;
  if (constraint === "unicyclic")
    title = `Construct a connected graph on ${n} vertices with exactly one cycle.`;
  if (constraint === "bipartite")
    title = `Construct a connected bipartite graph on ${n} vertices with ${edges.length} edges.`;
  if (constraint === "regular")
    title = `Construct a connected ${degrees[0]}-regular graph on ${n} vertices.`;
  if (constraint === "complete") title = `Construct the complete graph K${n}.`;
  return {
    mode: "network",
    id: seed,
    family: constraint === "labelled" ? `adjacency ${format}` : constraint,
    title,
    detail,
    answer,
    constraint,
    degrees,
    format,
    explanation:
      constraint === "labelled"
        ? "An entry 1 means an edge; 0 means no edge. Each undirected edge is counted once."
        : "The displayed graph is one valid construction. Every simple graph satisfying the stated constraints receives full credit, regardless of its shape or labels.",
  };
}
export function networkGame(seed: string, difficulty: Difficulty) {
  return shuffle([0, 1, 2, 3, 4], random(seed)).map((j, i) =>
    networkQuestion(`${seed}-${i}`, difficulty, j),
  );
}
export function customNetwork(
  input: string,
  format: "matrix" | "edges" | "degrees",
): NetworkQuestion {
  let answer: Network;
  if (format === "matrix") {
    const rows = input
      .trim()
      .split(/\n|;/)
      .map((row) =>
        row
          .trim()
          .split(/[\s,]+/)
          .map(Number),
      );
    const n = rows.length;
    if (
      n < 1 ||
      n > 12 ||
      rows.some(
        (row) => row.length !== n || row.some((v) => v !== 0 && v !== 1),
      )
    )
      throw new Error("Enter a square 0–1 matrix with 1–12 rows.");
    if (
      rows.some(
        (row, i) => row[i] !== 0 || row.some((v, j) => v !== rows[j][i]),
      )
    )
      throw new Error(
        "A simple undirected adjacency matrix must be symmetric with a zero diagonal.",
      );
    const edges: [number, number][] = [];
    rows.forEach((row, i) =>
      row.forEach((v, j) => {
        if (v && j > i) edges.push([i, j]);
      }),
    );
    answer = network(n, edges);
  } else if (format === "edges") {
    const parts = input
      .trim()
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const names: string[] = [];
    const edges: [number, number][] = [];
    for (const p of parts) {
      const pair = p.split(/[\s-]+/);
      if (pair.length > 2 || pair.some((x) => !/^\w{1,8}$/.test(x)))
        throw new Error(
          "Use A-B, B-C, D. A single label adds an isolated vertex.",
        );
      for (const name of pair) if (!names.includes(name)) names.push(name);
      if (pair.length === 2)
        edges.push([names.indexOf(pair[0]), names.indexOf(pair[1])]);
    }
    if (!names.length || names.length > 12)
      throw new Error("Use 1–12 vertices.");
    answer = network(names.length, edges);
    answer.vertices.forEach((v, i) => (v.label = names[i]));
    if (!isSimple(answer))
      throw new Error("Loops and duplicate edges are not allowed.");
  } else {
    const ds = input
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      !ds.length ||
      ds.length > 12 ||
      ds.some((d) => !Number.isInteger(d) || d < 0 || d >= ds.length)
    )
      throw new Error(
        "Use 1–12 integer degrees, each smaller than the number of vertices.",
      );
    const edges: [number, number][] = [];
    const remaining = ds.map((d, i) => ({ d, i }));
    while (remaining.some((x) => x.d)) {
      remaining.sort((a, b) => b.d - a.d);
      const head = remaining.shift()!;
      if (head.d > remaining.filter((x) => x.d > 0).length)
        throw new Error("This degree sequence is not graphical.");
      for (let j = 0; j < head.d; j++) {
        remaining[j].d--;
        edges.push([head.i, remaining[j].i]);
      }
    }
    answer = network(ds.length, edges);
  }
  return {
    mode: "network",
    id: `custom-${Date.now()}`,
    family: "custom graph",
    title:
      format === "degrees"
        ? `Construct a graph with degree sequence (${degreeSequence(answer).join(", ")}).`
        : "Construct this labelled graph.",
    detail: "Custom challenge · simple undirected graph",
    answer,
    constraint: format === "degrees" ? "degrees" : "labelled",
    degrees: degreeSequence(answer),
    format: format === "degrees" ? undefined : format,
    explanation:
      "Any construction matching the supplied structure is accepted.",
  };
}
