import { useEffect, useRef, useState } from "react";
import type { Network, NetworkQuestion, Point } from "../types";
import { edgeKey } from "../math/networks";
import { useUndo } from "./useUndo";
import {
  Circle,
  Link2,
  Move,
  Trash2,
  Undo2,
  Redo2,
  RotateCcw,
} from "lucide-react";
const empty: Network = { vertices: [], edges: [] };
export function NetworkCanvas({
  initial = empty,
  onChange,
  locked = false,
  compact = false,
}: {
  initial?: Network;
  onChange?: (g: Network) => void;
  locked?: boolean;
  compact?: boolean;
}) {
  const history = useUndo<Network>(initial),
    g = history.value;
  const [tool, setTool] = useState("vertex");
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState<Network | null>(null);
  const [edgeEnd, setEdgeEnd] = useState<Point | null>(null);
  const [notice, setNotice] = useState("");
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; start: Point; moved: boolean } | null>(
    null,
  );
  const counter = useRef(0);
  useEffect(() => onChange?.(g), [g, onChange]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        locked ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const pos = (e: { clientX: number; clientY: number }) => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 700,
      y: ((e.clientY - rect.top) / rect.height) * 480,
    };
  };
  const addEdge = (a: string, b: string) => {
    if (a === b) {
      setNotice("Loops are not allowed in a simple graph.");
      return;
    }
    if (g.edges.some((e) => edgeKey(...e) === edgeKey(a, b))) {
      setNotice("That edge already exists.");
      return;
    }
    history.set({ ...g, edges: [...g.edges, [a, b]] });
    setNotice("");
  };
  const draw = moving || g;
  const selectedVertex = g.vertices.find((v) => v.id === selected);
  return (
    <div className={`network-wrap ${compact ? "compact" : ""}`}>
      {!locked && (
        <>
          <div className="drawing-toolbar">
            {[
              { id: "vertex", label: "Add vertex", icon: <Circle /> },
              { id: "edge", label: "Connect", icon: <Link2 /> },
              { id: "move", label: "Move / label", icon: <Move /> },
              { id: "erase", label: "Remove", icon: <Trash2 /> },
            ].map((t) => (
              <button
                className={`tool ${tool === t.id ? "active" : ""}`}
                key={t.id}
                aria-label={t.label}
                title={t.label}
                aria-pressed={tool === t.id}
                onClick={() => {
                  setTool(t.id);
                  setSelected(null);
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
            <span className="tool-divider" />
            <button
              className="icon-btn"
              title="Undo"
              aria-label="Undo"
              disabled={!history.canUndo}
              onClick={history.undo}
            >
              <Undo2 />
            </button>
            <button
              className="icon-btn"
              title="Redo"
              aria-label="Redo"
              disabled={!history.canRedo}
              onClick={history.redo}
            >
              <Redo2 />
            </button>
            <button
              className="icon-btn"
              title="Reset graph (undoable)"
              aria-label="Reset graph"
              onClick={() => {
                history.set(empty);
                setSelected(null);
              }}
            >
              <RotateCcw />
            </button>
          </div>
          <div className="canvas-top">
            <span>
              NETWORK CANVAS{" "}
              <span className="muted">/ Simple · undirected</span>
            </span>
            <span>
              {g.vertices.length} vertices · {g.edges.length} edges
            </span>
          </div>
        </>
      )}
      <svg
        ref={ref}
        viewBox="0 0 700 480"
        preserveAspectRatio="none"
        className="network-canvas"
        role="img"
        aria-label="Graph construction canvas"
        onPointerDown={(e) => {
          if (locked || e.target !== e.currentTarget || tool !== "vertex")
            return;
          if (g.vertices.length >= 12) {
            setNotice("Maximum 12 vertices.");
            return;
          }
          const p = pos(e);
          const id = `v${Date.now()}-${counter.current++}`;
          let i = 0;
          while (
            g.vertices.some((v) => v.label === String.fromCharCode(65 + i))
          )
            i++;
          history.set({
            ...g,
            vertices: [
              ...g.vertices,
              { id, label: String.fromCharCode(65 + i), x: p.x, y: p.y },
            ],
          });
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = pos(e);
          drag.current.moved ||=
            Math.hypot(p.x - drag.current.start.x, p.y - drag.current.start.y) >
            5;
          if (tool === "move" || tool === "vertex")
            setMoving({
              ...g,
              vertices: g.vertices.map((v) =>
                v.id === drag.current!.id
                  ? {
                      ...v,
                      x: Math.max(22, Math.min(678, p.x)),
                      y: Math.max(22, Math.min(458, p.y)),
                    }
                  : v,
              ),
            });
          if (tool === "edge") setEdgeEnd(p);
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          const d = drag.current,
            p = pos(e);
          if (moving) {
            history.set(moving);
            setMoving(null);
          }
          if (tool === "edge") {
            const target = g.vertices.find(
              (v) => Math.hypot(v.x - p.x, v.y - p.y) < 25,
            );
            if (d.moved) {
              if (target && target.id !== d.id) addEdge(d.id, target.id);
              setSelected(null);
            } else if (selected && selected !== d.id) {
              addEdge(selected, d.id);
              setSelected(null);
            } else setSelected(d.id);
          }
          drag.current = null;
          setEdgeEnd(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setMoving(null);
          setEdgeEnd(null);
        }}
      >
        <defs>
          <pattern
            id={compact ? "dots-small" : "dots"}
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="12.5" cy="12.5" r="1" fill="var(--grid)" />
          </pattern>
        </defs>
        <rect
          width="700"
          height="480"
          fill={`url(#${compact ? "dots-small" : "dots"})`}
          pointerEvents="none"
        />
        {draw.edges.map(([a, b]) => {
          const v = draw.vertices.find((v) => v.id === a)!,
            w = draw.vertices.find((v) => v.id === b)!;
          return (
            <g
              key={edgeKey(a, b)}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (tool === "erase" && !locked)
                  history.set({
                    ...g,
                    edges: g.edges.filter(
                      (edge) => edgeKey(...edge) !== edgeKey(a, b),
                    ),
                  });
              }}
            >
              <line
                x1={v.x}
                y1={v.y}
                x2={w.x}
                y2={w.y}
                stroke="transparent"
                strokeWidth="18"
              />
              <line
                x1={v.x}
                y1={v.y}
                x2={w.x}
                y2={w.y}
                stroke={compact ? "#e26a3d" : "#5a6da9"}
                strokeWidth="3"
                pointerEvents="none"
              />
            </g>
          );
        })}
        {edgeEnd && drag.current && (
          <line
            x1={g.vertices.find((v) => v.id === drag.current!.id)?.x}
            y1={g.vertices.find((v) => v.id === drag.current!.id)?.y}
            x2={edgeEnd.x}
            y2={edgeEnd.y}
            stroke="#5a6da9"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        )}
        {draw.vertices.map((v) => (
          <g
            key={v.id}
            role="button"
            aria-label={`Vertex ${v.label}`}
            tabIndex={locked ? -1 : 0}
            onKeyDown={(e) => {
              if (locked) return;
              if (e.key === "Enter" && tool === "edge") {
                if (selected && selected !== v.id) {
                  addEdge(selected, v.id);
                  setSelected(null);
                } else setSelected(v.id);
              }
              if (e.key === "Delete")
                history.set({
                  vertices: g.vertices.filter((w) => w.id !== v.id),
                  edges: g.edges.filter((edge) => !edge.includes(v.id)),
                });
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (locked) return;
              if (tool === "erase") {
                history.set({
                  vertices: g.vertices.filter((w) => w.id !== v.id),
                  edges: g.edges.filter((edge) => !edge.includes(v.id)),
                });
                return;
              }
              ref.current!.setPointerCapture(e.pointerId);
              drag.current = { id: v.id, start: pos(e), moved: false };
              if (tool !== "edge") setSelected(v.id);
            }}
            style={{
              cursor: locked
                ? "default"
                : tool === "edge"
                  ? "crosshair"
                  : "grab",
            }}
          >
            <circle
              cx={v.x}
              cy={v.y}
              r="20"
              fill={selected === v.id ? "#146b55" : "var(--canvas)"}
              stroke={
                compact ? "#e26a3d" : selected === v.id ? "#146b55" : "#5a6da9"
              }
              strokeWidth="2.5"
            />
            <text
              x={v.x}
              y={v.y + 5}
              textAnchor="middle"
              fill={selected === v.id ? "white" : "var(--text)"}
              fontSize="14"
              fontWeight="600"
            >
              {v.label}
            </text>
          </g>
        ))}
        {!g.vertices.length && (
          <text
            x="350"
            y="240"
            textAnchor="middle"
            fill="var(--muted)"
            fontSize="15"
            pointerEvents="none"
          >
            Click to place your first vertex
          </text>
        )}
      </svg>
      {!locked && (
        <>
          <div className="canvas-footer">
            <span>
              {tool === "vertex"
                ? "Click empty space to add a vertex. Drag vertices to arrange them."
                : tool === "edge"
                  ? "Click two vertices or drag between them to connect."
                  : tool === "move"
                    ? "Drag vertices to rearrange them. Select a vertex to change its label."
                    : "Click an edge or vertex to remove it."}
            </span>
          </div>
          {selectedVertex && tool === "move" && (
            <label className="vertex-label">
              Selected vertex label
              <input
                aria-label="Vertex label"
                value={selectedVertex.label}
                maxLength={8}
                onChange={(e) => {
                  if (!e.target.value.trim()) return;
                  history.set({
                    ...g,
                    vertices: g.vertices.map((v) =>
                      v.id === selected ? { ...v, label: e.target.value } : v,
                    ),
                  });
                }}
              />
            </label>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </>
      )}
    </div>
  );
}
export function NetworkPrompt({ question: q }: { question: NetworkQuestion }) {
  if (q.constraint !== "labelled") return null;
  const g = q.answer;
  const linked = (a: string, b: string) =>
    g.edges.some((e) => edgeKey(...e) === edgeKey(a, b));
  if (q.format === "matrix")
    return (
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th aria-label="Vertex" />
              {g.vertices.map((v) => (
                <th key={v.id}>{v.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.vertices.map((v) => (
              <tr key={v.id}>
                <th>{v.label}</th>
                {g.vertices.map((w) => (
                  <td key={w.id}>{linked(v.id, w.id) ? 1 : 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (q.format === "list")
    return (
      <div className="adjacency-list">
        {g.vertices.map((v) => (
          <span key={v.id}>
            <b>{v.label}</b> →{" "}
            {g.vertices
              .filter((w) => linked(v.id, w.id))
              .map((w) => w.label)
              .join(", ") || "∅"}
          </span>
        ))}
      </div>
    );
  return (
    <p className="edge-list">
      Vertices: {g.vertices.map((v) => v.label).join(", ")}
      <br />
      Edges:{" "}
      {g.edges
        .map(
          ([a, b]) =>
            `${g.vertices.find((v) => v.id === a)!.label}–${g.vertices.find((v) => v.id === b)!.label}`,
        )
        .join(", ") || "none"}
    </p>
  );
}
