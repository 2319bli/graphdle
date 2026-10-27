export type Mode = "function" | "network" | "complex";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
export interface Point {
  x: number;
  y: number;
}
export interface View {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}
export type ItemKind =
  | "curve"
  | "asymptote"
  | "xroot"
  | "yroot"
  | "turn"
  | "point"
  | "open"
  | "closed"
  | "line"
  | "ray"
  | "circle"
  | "region"
  | "disk";
export interface Item {
  id: string;
  kind: ItemKind;
  points: Point[];
  dashed?: boolean;
}
export interface Features {
  xroots: Point[];
  yroots: Point[];
  turns: Point[];
  asymptotes: Point[][];
  open?: Point[];
  closed?: Point[];
}
export interface PlotQuestion {
  mode: "function" | "complex";
  id: string;
  family: string;
  title: string;
  detail: string;
  view: View;
  reference: Point[][];
  features: Features;
  properties: string[];
  falseProperties?: string[];
  region?: (p: Point) => boolean;
  excluded?: Point[];
  boundaryDashed?: boolean;
  curveOnly?: boolean;
  practiceOnly?: boolean;
  explanation: string;
}
export interface Vertex {
  id: string;
  label: string;
  x: number;
  y: number;
}
export interface Network {
  vertices: Vertex[];
  edges: [string, string][];
}
export interface NetworkQuestion {
  mode: "network";
  id: string;
  family: string;
  title: string;
  detail: string;
  answer: Network;
  constraint:
    | "labelled"
    | "degrees"
    | "tree"
    | "unicyclic"
    | "bipartite"
    | "regular"
    | "complete";
  degrees?: number[];
  explanation: string;
  format?: "matrix" | "list" | "edges";
}
export type Question = PlotQuestion | NetworkQuestion;
export interface Breakdown {
  label: string;
  score: number;
  max: number;
  message: string;
}
export interface Grade {
  score: number;
  breakdown: Breakdown[];
  feedback: string[];
  claims?: {
    text: string;
    status: "correct" | "incorrect" | "unverified" | "duplicate";
  }[];
}
export interface Answer {
  question: Question;
  drawing: Item[];
  network: Network;
  properties: string;
  grade: Grade;
}
export interface HistoryEntry {
  id: string;
  mode: Mode;
  difficulty: Difficulty;
  date: string;
  score: number;
  questions: { family: string; score: number; title: string }[];
}
export const DEFAULT_VIEW: View = { xmin: -6, xmax: 6, ymin: -5, ymax: 5 };
export const emptyFeatures = (): Features => ({
  xroots: [],
  yroots: [],
  turns: [],
  asymptotes: [],
});
