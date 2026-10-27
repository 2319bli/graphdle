import { useEffect, useRef, useState } from "react";
import type { Item, ItemKind, PlotQuestion, Point, View } from "../types";
import {
  distance,
  itemPath,
  normalizedDistance,
  point,
  polygonContains,
  segmentDistance,
  toMath,
  toScreen,
} from "../math/geometry";
import { useUndo } from "./useUndo";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid2X2,
  Move,
  MousePointer2,
  Trash2,
  Eraser,
  Pencil,
  Minus,
  Triangle,
  Circle,
  Star,
  Dot,
  ArrowUpRight,
  PaintBucket,
} from "lucide-react";
type Tool = ItemKind | "pan" | "move" | "erase";
const W = 840,
  H = 520;
const ink: Record<string, string> = {
  curve: "#3275cf",
  asymptote: "#7a8492",
  xroot: "#178656",
  yroot: "#d39312",
  turn: "#9054d0",
  open: "#3275cf",
  closed: "#3275cf",
  point: "#3275cf",
  line: "#3275cf",
  ray: "#3275cf",
  circle: "#3275cf",
  region: "#3275cf",
  disk: "#3275cf",
};
const niceStep = (span: number) => {
  const base = 10 ** Math.floor(Math.log10(span / 10));
  const n = span / 10 / base;
  return (n < 2 ? 1 : n < 5 ? 2 : 5) * base;
};
export function Plane({
  question: q,
  onChange,
  initial = [],
  locked = false,
  solution = false,
}: {
  question: PlotQuestion;
  onChange?: (items: Item[]) => void;
  initial?: Item[];
  locked?: boolean;
  solution?: boolean;
}) {
  const history = useUndo<Item[]>(initial),
    items = history.value;
  const [view, setView] = useState<View>(q.view);
  const [tool, setTool] = useState<Tool>("curve");
  const [grid, setGrid] = useState(true);
  const [dashed, setDashed] = useState(false);
  const [draft, setDraft] = useState<Item | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const [draftView, setDraftView] = useState(q.view);
  const [polygon, setPolygon] = useState<Point[]>([]);
  const [instructions, setInstructions] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<{
    start: Point;
    screen: Point;
    original: View;
    item?: Item;
    id?: number;
  } | null>(null);
  const seq = useRef(0);
  const commit = (next: Item[]) => {
    history.set(next);
    onChange?.(next);
  };
  const undo = history.undo;
  useEffect(() => {
    onChange?.(items);
  }, [items, onChange]);
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
      } else if (e.key === "Escape") {
        setPolygon([]);
        setDraft(null);
        gesture.current = null;
      } else if (e.key.toLowerCase() === "b") setTool("curve");
      else if (e.key.toLowerCase() === "e") setTool("erase");
      else if (e.key.toLowerCase() === "h") setTool("pan");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const screen = (e: { clientX: number; clientY: number }) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return point(
      ((e.clientX - rect.left) / rect.width) * W,
      ((e.clientY - rect.top) / rect.height) * H,
    );
  };
  const math = (e: { clientX: number; clientY: number }) =>
    toMath(screen(e), view, W, H);
  const path = (ps: Point[]) =>
    ps
      .map((p, i) => {
        const s = toScreen(p, view, W, H);
        return `${i ? "L" : "M"}${s.x.toFixed(2)},${s.y.toFixed(2)}`;
      })
      .join(" ");
  const nearest = (p: Point) =>
    items
      .map((i) => {
        const ps = itemPath(i, view);
        const d =
          ps.length === 1
            ? normalizedDistance(p, ps[0], view)
            : Math.min(
                ...ps
                  .slice(1)
                  .map(
                    (b, j) =>
                      segmentDistance(
                        toScreen(p, view, W, H),
                        toScreen(ps[j], view, W, H),
                        toScreen(b, view, W, H),
                      ) / W,
                  ),
              );
        return { i, d };
      })
      .sort((a, b) => a.d - b.d)[0];
  const snap = (p: Point, kind: Tool) =>
    kind === "xroot" ? point(p.x, 0) : kind === "yroot" ? point(0, p.y) : p;
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked) return;
    e.preventDefault();
    const p = math(e);
    if (tool === "region") {
      setPolygon([...polygon, p]);
      return;
    }
    svgRef.current!.setPointerCapture(e.pointerId);
    if (tool === "erase") {
      const hit = nearest(p);
      if (hit && hit.d < 0.04) commit(items.filter((i) => i.id !== hit.i.id));
      return;
    }
    if (tool === "move") {
      const hit = nearest(p);
      if (hit && hit.d < 0.045) {
        gesture.current = {
          start: p,
          screen: screen(e),
          original: view,
          item: hit.i,
        };
        setDraft(hit.i);
      }
      return;
    }
    if (tool === "pan") {
      gesture.current = { start: p, screen: screen(e), original: view };
      return;
    }
    const item: Item = {
      id: `i${seq.current++}-${Date.now()}`,
      kind: tool,
      points: [snap(p, tool)],
      dashed: tool === "asymptote" || dashed,
    };
    if (["xroot", "yroot", "turn", "point", "open", "closed"].includes(tool)) {
      commit([...items, item]);
      return;
    }
    gesture.current = { start: p, screen: screen(e), original: view };
    setDraft(item);
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = math(e);
    setCursor(p);
    const g = gesture.current;
    if (!g || locked) return;
    if (tool === "pan") {
      const s = screen(e),
        dx = ((s.x - g.screen.x) / W) * (g.original.xmax - g.original.xmin),
        dy = (-(s.y - g.screen.y) / H) * (g.original.ymax - g.original.ymin);
      setView({
        xmin: g.original.xmin - dx,
        xmax: g.original.xmax - dx,
        ymin: g.original.ymin - dy,
        ymax: g.original.ymax - dy,
      });
      return;
    }
    if (tool === "move" && g.item) {
      const dx = p.x - g.start.x,
        dy = p.y - g.start.y;
      setDraft({
        ...g.item,
        points: g.item.points.map((pt) =>
          snap(point(pt.x + dx, pt.y + dy), g.item!.kind),
        ),
      });
      return;
    }
    if (draft) {
      if (tool === "curve") {
        if (distance(draft.points[draft.points.length - 1], p) > 0.002)
          setDraft({ ...draft, points: [...draft.points, p] });
      } else setDraft({ ...draft, points: [g.start, p] });
    }
  };
  const up = () => {
    if (draft && gesture.current) {
      if (draft.points.length > 1 || gesture.current.item)
        commit(
          gesture.current.item
            ? items.map((i) => (i.id === draft.id ? draft : i))
            : [...items, draft],
        );
    }
    gesture.current = null;
    setDraft(null);
  };
  const zoom = (
    factor: number,
    axis: "both" | "x" | "y" = "both",
    anchor?: Point,
  ) =>
    setView((v) => {
      const c = anchor || point((v.xmin + v.xmax) / 2, (v.ymin + v.ymax) / 2);
      const sx = axis === "y" ? 1 : factor,
        sy = axis === "x" ? 1 : factor;
      const next = {
        xmin: c.x + (v.xmin - c.x) * sx,
        xmax: c.x + (v.xmax - c.x) * sx,
        ymin: c.y + (v.ymin - c.y) * sy,
        ymax: c.y + (v.ymax - c.y) * sy,
      };
      return next.xmax - next.xmin > 0.005 &&
        next.ymax - next.ymin > 0.005 &&
        next.xmax - next.xmin < 1e5
        ? next
        : v;
    });
  const finishRegion = () => {
    if (polygon.length >= 3) {
      commit([
        ...items,
        {
          id: `i${seq.current++}-${Date.now()}`,
          kind: "region",
          points: polygon,
        },
      ]);
      setPolygon([]);
    }
  };
  const ticks = (min: number, max: number) => {
    const step = niceStep(max - min);
    return Array.from(
      { length: Math.min(60, Math.ceil((max - min) / step) + 1) },
      (_, i) => Math.ceil(min / step) * step + i * step,
    ).filter((x) => x <= max + 1e-10);
  };
  const xs = ticks(view.xmin, view.xmax),
    ys = ticks(view.ymin, view.ymax);
  const origin = toScreen(point(0, 0), view, W, H);
  const drawItem = (item: Item, reference = false) => {
    const ps = itemPath(item, view);
    if (!ps.length) return null;
    const p = toScreen(ps[0], view, W, H),
      colour = reference ? "#e26a3d" : ink[item.kind];
    const marker = [
      "xroot",
      "yroot",
      "turn",
      "point",
      "open",
      "closed",
    ].includes(item.kind);
    const title = reference
      ? "Reference feature"
      : `${item.kind} (${item.points[0].x.toFixed(2)}, ${item.points[0].y.toFixed(2)})`;
    return (
      <g key={item.id} className={reference ? "reference-feature" : undefined}>
        <title>{title}</title>
        {marker ? (
          item.kind === "xroot" ? (
            <path d={`M${p.x} ${p.y - 8}l-7 13h14Z`} fill={colour} />
          ) : item.kind === "turn" ? (
            <path
              d={
                Array.from({ length: 10 }, (_, j) => {
                  const a = (j * Math.PI) / 5 - Math.PI / 2,
                    r = j % 2 ? 4 : 9;
                  return `${j ? "L" : "M"}${p.x + r * Math.cos(a)},${p.y + r * Math.sin(a)}`;
                }).join(" ") + "Z"
              }
              fill={colour}
            />
          ) : (
            <circle
              cx={p.x}
              cy={p.y}
              r={item.kind === "yroot" ? 6 : 5}
              fill={item.kind === "open" ? "var(--canvas)" : colour}
              stroke={colour}
              strokeWidth={2.5}
            />
          )
        ) : (
          <path
            d={path(ps) + (item.kind === "region" ? "Z" : "")}
            stroke={
              item.kind === "region" || item.kind === "disk" ? "none" : colour
            }
            strokeWidth={reference ? 2.5 : 2.8}
            strokeDasharray={item.dashed ? "7 6" : undefined}
            fill={
              item.kind === "region" || item.kind === "disk" ? colour : "none"
            }
            fillOpacity={0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    );
  };
  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    {
      id: "curve",
      label: q.mode === "function" ? "Brush" : "Locus",
      icon: <Pencil />,
    },
    ...(q.mode === "function"
      ? [
          { id: "asymptote" as Tool, label: "Asymptote", icon: <Minus /> },
          { id: "xroot" as Tool, label: "x-intercept", icon: <Triangle /> },
          { id: "yroot" as Tool, label: "y-intercept", icon: <Circle /> },
          { id: "turn" as Tool, label: "Turning point", icon: <Star /> },
        ]
      : [
          { id: "point" as Tool, label: "Point", icon: <Dot /> },
          { id: "line" as Tool, label: "Line", icon: <Minus /> },
          { id: "ray" as Tool, label: "Ray", icon: <ArrowUpRight /> },
          { id: "circle" as Tool, label: "Circle", icon: <Circle /> },
          {
            id: "region" as Tool,
            label: "Shade polygon",
            icon: <PaintBucket />,
          },
          { id: "disk" as Tool, label: "Shade disk", icon: <Circle /> },
        ]),
    { id: "open", label: "Open point", icon: <Circle /> },
    { id: "closed", label: "Closed point", icon: <Dot /> },
    { id: "move", label: "Select / move", icon: <MousePointer2 /> },
    { id: "erase", label: "Erase", icon: <Eraser /> },
    { id: "pan", label: "Pan", icon: <Move /> },
  ];
  const help: Partial<Record<Tool, string>> = {
    curve: "Drag to sketch. Lift to start a separate branch. Shortcut B.",
    asymptote: "Drag between two points for a straight dotted asymptote.",
    xroot: "Click to place an x-intercept. Snaps to the x-axis.",
    yroot: "Click to place a y-intercept. Snaps to the y-axis.",
    turn: "Click to mark a local maximum or minimum.",
    move: "Drag a marker or curve to reposition it.",
    erase: "Click a stroke or marker to delete it. Shortcut E.",
    pan: "Drag the plane. Scroll to zoom. Shortcut H.",
    circle: "Drag from the centre to the circumference.",
    disk: "Drag from the centre to fill a disk. Draw its boundary separately.",
    region:
      "Click around the region, then Finish region. Multiple polygons can be combined; trace annuli as strips.",
    ray: "Drag from the starting point along the direction of the ray.",
    line: "Drag between two points. The line extends in both directions.",
    open: "Click to mark an excluded endpoint or hole.",
    closed: "Click to mark an included endpoint.",
  };
  return (
    <div className="plane-wrap">
      <div className="drawing-toolbar" aria-label="Drawing tools">
        {!locked &&
          tools.map((t) => (
            <button
              key={t.id}
              className={tool === t.id ? "tool active" : "tool"}
              title={t.label}
              aria-label={t.label}
              aria-pressed={tool === t.id}
              onClick={() => {
                setTool(t.id);
                setPolygon([]);
              }}
              style={
                {
                  "--tool-color": ink[t.id] || "var(--accent)",
                } as React.CSSProperties
              }
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        {!locked && (
          <>
            <span className="tool-divider" />
            <button
              className="icon-btn"
              aria-label="Undo"
              title="Undo (Ctrl/⌘ Z)"
              disabled={!history.canUndo}
              onClick={undo}
            >
              <Undo2 />
            </button>
            <button
              className="icon-btn"
              aria-label="Redo"
              title="Redo (Ctrl/⌘ Shift Z)"
              disabled={!history.canRedo}
              onClick={history.redo}
            >
              <Redo2 />
            </button>
            <button
              className="icon-btn"
              title="Clear drawing (undoable)"
              aria-label="Clear drawing"
              onClick={() => commit([])}
            >
              <Trash2 />
            </button>
          </>
        )}
        {q.mode === "complex" && !locked && (
          <label className="check">
            <input
              type="checkbox"
              checked={dashed}
              onChange={(e) => setDashed(e.target.checked)}
            />
            Dashed
          </label>
        )}
      </div>
      <div className="canvas-top">
        <span>
          {q.mode === "function"
            ? "CARTESIAN PLANE"
            : q.family === "squaremap"
              ? "IMAGE PLANE · w"
              : "ARGAND PLANE"}{" "}
          <span className="muted">
            / {solution ? "Answer overlay" : "Your drawing"}
          </span>
        </span>
        <button
          className="text-button"
          onClick={() => setInstructions(!instructions)}
        >
          How to draw
        </button>
      </div>
      {instructions && (
        <div className="canvas-instructions">
          Choose a tool and draw on the grid. All geometry is stored in
          mathematical coordinates. Pan, zoom, or change each axis independently
          below. Cover the original assessment window shown by its dashed frame;
          zooming does not reduce the marking scope. Blue is your answer; orange
          appears after submission. Keyboard: B brush, E eraser, H pan, Ctrl/⌘ Z
          undo.
        </div>
      )}
      <svg
        ref={svgRef}
        className={`plane tool-${tool}`}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${q.mode === "function" ? "Cartesian" : "Argand"} interactive drawing canvas`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          gesture.current = null;
          setDraft(null);
        }}
        onPointerLeave={() => setCursor(null)}
        onWheel={(e) => {
          if (!locked) {
            zoom(
              Math.exp(e.deltaY * 0.001),
              e.shiftKey ? "x" : e.altKey ? "y" : "both",
              math(e),
            );
          }
        }}
      >
        <defs>
          <clipPath id={`clip-${q.id}`}>
            <rect width={W} height={H} />
          </clipPath>
        </defs>
        <rect width={W} height={H} fill="var(--canvas)" />
        <g clipPath={`url(#clip-${q.id})`}>
          {grid && (
            <g stroke="var(--grid)" strokeWidth="1">
              {xs.map((x) => (
                <path
                  key={`x${x}`}
                  d={`M${toScreen(point(x, 0), view, W, H).x} 0V${H}`}
                />
              ))}
              {ys.map((y) => (
                <path
                  key={`y${y}`}
                  d={`M0 ${toScreen(point(0, y), view, W, H).y}H${W}`}
                />
              ))}
            </g>
          )}
          <g stroke="var(--axis)" strokeWidth="1.4">
            <path d={`M0 ${origin.y}H${W}M${origin.x} 0V${H}`} />
          </g>
          <rect
            x={toScreen(point(q.view.xmin, q.view.ymax), view, W, H).x + 1}
            y={toScreen(point(q.view.xmin, q.view.ymax), view, W, H).y + 1}
            width={
              ((q.view.xmax - q.view.xmin) / (view.xmax - view.xmin)) * W - 2
            }
            height={
              ((q.view.ymax - q.view.ymin) / (view.ymax - view.ymin)) * H - 2
            }
            fill="none"
            stroke="var(--axis)"
            strokeOpacity=".35"
            strokeDasharray="4 6"
          />
          {items.filter((i) => i.id !== draft?.id).map((i) => drawItem(i))}
          {draft && drawItem(draft)}
          {polygon.length > 0 && (
            <path
              d={path(polygon)}
              fill="#3275cf"
              fillOpacity=".12"
              stroke="#3275cf"
              strokeDasharray="4 3"
            />
          )}
          {solution && q.region && (
            <g fill="#e26a3d" opacity=".13">
              {Array.from({ length: 45 * 35 }, (_, i) => {
                const ix = i % 45,
                  iy = Math.floor(i / 45),
                  p = point(
                    q.view.xmin +
                      ((ix + 0.5) / 45) * (q.view.xmax - q.view.xmin),
                    q.view.ymin +
                      ((iy + 0.5) / 35) * (q.view.ymax - q.view.ymin),
                  );
                if (!q.region!(p)) return null;
                const s = toScreen(
                  point(
                    p.x - (q.view.xmax - q.view.xmin) / 90,
                    p.y + (q.view.ymax - q.view.ymin) / 70,
                  ),
                  view,
                  W,
                  H,
                );
                return (
                  <rect
                    key={i}
                    x={s.x}
                    y={s.y}
                    width={
                      ((q.view.xmax - q.view.xmin) /
                        45 /
                        (view.xmax - view.xmin)) *
                        W +
                      0.3
                    }
                    height={
                      ((q.view.ymax - q.view.ymin) /
                        35 /
                        (view.ymax - view.ymin)) *
                        H +
                      0.3
                    }
                  />
                );
              })}
            </g>
          )}
          {solution && (
            <g
              stroke="#e26a3d"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              {q.reference.map((ps, i) => (
                <path
                  key={i}
                  d={path(ps)}
                  strokeDasharray={q.boundaryDashed ? "7 6" : undefined}
                />
              ))}
              {q.features.asymptotes.map((ps, i) => (
                <path
                  key={`a${i}`}
                  d={path(ps)}
                  strokeDasharray="6 5"
                  opacity=".75"
                />
              ))}
            </g>
          )}
          {solution &&
            (["xroots", "yroots", "turns", "open", "closed"] as const).flatMap(
              (key) =>
                (q.features[key] || []).map((p, i) =>
                  drawItem(
                    {
                      id: `ref-${key}-${i}`,
                      kind: (
                        {
                          xroots: "xroot",
                          yroots: "yroot",
                          turns: "turn",
                          open: "open",
                          closed: "closed",
                        } as const
                      )[key],
                      points: [p],
                    },
                    true,
                  ),
                ),
            )}
          <g className="tick-labels" fill="var(--muted)" fontSize="11">
            {xs
              .filter((x) => Math.abs(x) > 1e-8)
              .map((x) => (
                <text
                  key={x}
                  x={toScreen(point(x, 0), view, W, H).x + 4}
                  y={Math.max(15, Math.min(H - 8, origin.y + 17))}
                >
                  {+x.toPrecision(4)}
                </text>
              ))}
            {ys
              .filter((y) => Math.abs(y) > 1e-8)
              .map((y) => (
                <text
                  key={y}
                  x={Math.max(5, Math.min(W - 35, origin.x + 7))}
                  y={toScreen(point(0, y), view, W, H).y - 5}
                >
                  {+y.toPrecision(4)}
                </text>
              ))}
          </g>
          <text
            x={W - 12}
            y={Math.max(20, Math.min(H - 10, origin.y - 10))}
            textAnchor="end"
            fill="var(--text)"
            fontSize="13"
          >
            {q.mode === "function"
              ? "x"
              : q.family === "squaremap"
                ? "Re(w)"
                : "Re(z)"}
          </text>
          <text
            x={Math.max(10, Math.min(W - 50, origin.x + 10))}
            y={20}
            fill="var(--text)"
            fontSize="13"
          >
            {q.mode === "function"
              ? "y"
              : q.family === "squaremap"
                ? "Im(w)"
                : "Im(z)"}
          </text>
        </g>
      </svg>
      <div className="canvas-footer">
        <span className="tool-help">
          {locked
            ? "Blue: your answer · Orange: reference"
            : help[tool] || "Click on the plane to place a point."}
        </span>
        <span className="coordinates">
          {cursor ? `${cursor.x.toFixed(2)}, ${cursor.y.toFixed(2)}` : "x, y"}
        </span>
      </div>
      {tool === "region" && polygon.length > 0 && !locked && (
        <div className="region-actions">
          <span>{polygon.length} vertices</span>
          <button
            className="button small"
            disabled={polygon.length < 3}
            onClick={finishRegion}
          >
            Finish region
          </button>
          <button className="text-button" onClick={() => setPolygon([])}>
            Cancel
          </button>
        </div>
      )}
      <div className="view-controls">
        <button
          className="icon-btn"
          aria-label="Zoom in"
          onClick={() => zoom(0.8)}
        >
          <ZoomIn />
        </button>
        <button
          className="icon-btn"
          aria-label="Zoom out"
          onClick={() => zoom(1.25)}
        >
          <ZoomOut />
        </button>
        <button
          className="icon-btn"
          aria-label="Reset view"
          title="Reset view"
          onClick={() => setView(q.view)}
        >
          <RotateCcw />
        </button>
        <button
          className={`icon-btn ${grid ? "selected" : ""}`}
          aria-label="Toggle grid"
          aria-pressed={grid}
          onClick={() => setGrid(!grid)}
        >
          <Grid2X2 />
        </button>
        <span className="tool-divider" />
        <span className="axis-controls">
          x scale{" "}
          <button aria-label="Expand x range" onClick={() => zoom(1.25, "x")}>
            −
          </button>
          <button aria-label="Contract x range" onClick={() => zoom(0.8, "x")}>
            +
          </button>
        </span>
        <span className="axis-controls">
          y scale{" "}
          <button aria-label="Expand y range" onClick={() => zoom(1.25, "y")}>
            −
          </button>
          <button aria-label="Contract y range" onClick={() => zoom(0.8, "y")}>
            +
          </button>
        </span>
        <button
          className="text-button ranges-button"
          onClick={() => {
            setDraftView(view);
            setRangeOpen(!rangeOpen);
          }}
        >
          Set ranges
        </button>
      </div>
      {rangeOpen && (
        <form
          className="range-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !Object.values(draftView).every(Number.isFinite) ||
              draftView.xmax <= draftView.xmin ||
              draftView.ymax <= draftView.ymin ||
              Math.max(...Object.values(draftView).map(Math.abs)) > 10000
            ) {
              setRangeError(
                "Enter increasing, finite ranges between −10000 and 10000.",
              );
              return;
            }
            setView(draftView);
            setRangeError("");
            setRangeOpen(false);
          }}
        >
          {(["xmin", "xmax", "ymin", "ymax"] as const).map((key) => (
            <label key={key}>
              {key}
              <input
                aria-label={key}
                type="number"
                step="any"
                value={draftView[key]}
                onChange={(e) =>
                  setDraftView({ ...draftView, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <button className="button small">Apply</button>
          {rangeError && <p role="alert">{rangeError}</p>}
        </form>
      )}
    </div>
  );
}
export function containsShading(p: Point, items: Item[]) {
  return items.some((i) => i.kind === "region" && polygonContains(p, i.points));
}
