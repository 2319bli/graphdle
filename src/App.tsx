import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Moon,
  Sun,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  X,
  RotateCcw,
  Trophy,
  BookOpen,
  Settings2,
  GitBranch,
  Workflow,
  Infinity as InfinityIcon,
} from "lucide-react";
import type {
  Answer,
  Difficulty,
  HistoryEntry,
  Item,
  Mode,
  Network,
  Question,
  View,
} from "./types";
import { DEFAULT_VIEW, emptyFeatures } from "./types";
import { functionGame } from "./math/functions";
import { networkGame, customNetwork } from "./math/networks";
import { complexGame, customComplex } from "./math/complex";
import { gradeNetwork, gradePlot } from "./math/grading";
import { Plane } from "./components/Plane";
import { PropertyPicker } from "./components/PropertyPicker";
import { serializePropertyTags } from "./math/propertyTags";
import { NetworkCanvas, NetworkPrompt } from "./components/NetworkCanvas";
import { getTheme, readHistory, saveHistory } from "./storage";
const names: Record<Mode, string> = {
  function: "Function Sketching",
  network: "Graph Theory",
  complex: "Complex Graphing",
};
const taglines: Record<Mode, string> = {
  function: "Turn an equation into intuition.",
  network: "Make the right connections.",
  complex: "Find your way around the complex plane.",
};
const descriptions: Record<Mode, string> = {
  function:
    "Sketch curves, spot turning points, and get a feel for how functions behave.",
  network:
    "Build networks from matrices, degree sequences, and mathematical constraints.",
  complex:
    "Explore loci, boundaries, and regions on an interactive Argand diagram.",
};
const modeIcons = {
  function: <ChartNoAxesCombined />,
  network: <GitBranch />,
  complex: <InfinityIcon />,
};
const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const modes: Mode[] = ["function", "network", "complex"];
const emptyNetwork: Network = { vertices: [], edges: [] };
const performance = (score: number) =>
  score >= 450
    ? "Exceptional"
    : score >= 375
      ? "Strong intuition"
      : score >= 300
        ? "Taking shape"
        : score >= 200
          ? "Finding your line"
          : "Keep exploring";
function Illustration({ mode, hero = false }: { mode: Mode; hero?: boolean }) {
  return (
    <svg
      viewBox="0 0 340 175"
      className={hero ? "hero-illustration" : "card-illustration"}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`mini-${mode}-${hero}`}
          width="23"
          height="23"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M23 0H0V23"
            stroke="currentColor"
            strokeOpacity=".08"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="340" height="175" fill={`url(#mini-${mode}-${hero})`} />
      {mode === "function" ? (
        <>
          <path
            d="M24 123H316M128 15V161"
            stroke="currentColor"
            opacity=".25"
          />
          <path
            d="M30 143C65 142 68 39 112 47S164 160 213 113S260 24 314 30"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="112"
            cy="47"
            r="5"
            fill="var(--card)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="186"
            cy="128"
            r="5"
            fill="var(--card)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text
            x="243"
            y="151"
            fill="currentColor"
            fontSize="15"
            fontFamily="Georgia"
            fontStyle="italic"
          >
            y = f(x)
          </text>
        </>
      ) : mode === "network" ? (
        <>
          <path
            d="M75 91L145 35L251 56L270 131L169 148L75 91L251 56M145 35L169 148M169 148L251 56"
            stroke="currentColor"
            strokeWidth="2"
            opacity=".65"
          />
          {[
            [75, 91],
            [145, 35],
            [251, 56],
            [270, 131],
            [169, 148],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="13"
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth="2"
              />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
              >
                {String.fromCharCode(65 + i)}
              </text>
            </g>
          ))}
        </>
      ) : (
        <>
          <path
            d="M28 110H315M143 15V160"
            stroke="currentColor"
            opacity=".25"
          />
          <circle
            cx="190"
            cy="81"
            r="53"
            fill="currentColor"
            fillOpacity=".09"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M190 81L226 43"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="190" cy="81" r="3" fill="currentColor" />
          <text
            x="245"
            y="151"
            fill="currentColor"
            fontSize="15"
            fontFamily="Georgia"
            fontStyle="italic"
          >
            z = x + iy
          </text>
        </>
      )}
    </svg>
  );
}
function ScoreFeedback({ answer }: { answer: Answer }) {
  return (
    <section className="feedback" aria-live="polite">
      <div className="feedback-heading">
        <span className="eyebrow">ANSWER REVIEW</span>
        <strong>
          {answer.question.mode !== "network" && answer.question.practiceOnly
            ? "Practice"
            : `${answer.grade.score}`}
          <small>
            {answer.question.mode !== "network" && answer.question.practiceOnly
              ? ""
              : " / 100"}
          </small>
        </strong>
      </div>
      {answer.grade.feedback.map((f, i) => (
        <p key={i}>{f}</p>
      ))}
      <div className="breakdowns">
        {answer.grade.breakdown.map((b) => (
          <details key={b.label}>
            <summary>
              <span>{b.label}</span>
              <b>
                {b.score}
                <small> / {b.max}</small>
              </b>
            </summary>
            <p>{b.message}</p>
          </details>
        ))}
      </div>
      {answer.grade.claims && answer.grade.claims.length > 0 && (
        <div className="claims">
          {answer.grade.claims.map((c, i) => (
            <div key={i} className={`claim ${c.status}`}>
              <span>
                {c.status === "correct"
                  ? "✓"
                  : c.status === "incorrect"
                    ? "×"
                    : "·"}
              </span>
              {c.text}
              <small>{c.status}</small>
            </div>
          ))}
        </div>
      )}
      {answer.question.mode === "function" &&
        answer.question.properties.length > 0 && (
          <p className="property-suggestions">
            <b>Properties you could mention:</b>{" "}
            {answer.question.properties
              .filter((p) => !p.startsWith("period:"))
              .join("; ")}
            . “Continuous” and “differentiable” refer to the stated domain.
          </p>
        )}
    </section>
  );
}
function CustomDialog({
  mode,
  onClose,
  onStart,
}: {
  mode: Mode;
  onClose: () => void;
  onStart: (q: Question) => void;
}) {
  const [text, setText] = useState(
    mode === "function"
      ? "sin(x) + x/2"
      : mode === "network"
        ? "0 1 0\n1 0 1\n0 1 0"
        : "|z-(2+1i)| = 3",
  );
  const [format, setFormat] = useState<"matrix" | "edges" | "degrees">(
    "matrix",
  );
  const [view, setView] = useState<View>({ ...DEFAULT_VIEW });
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const start = async (practice = false) => {
    try {
      if (
        !Object.values(view).every(Number.isFinite) ||
        view.xmin >= view.xmax ||
        view.ymin >= view.ymax ||
        Math.max(...Object.values(view).map(Math.abs)) > 10000
      )
        throw new Error(
          "Enter increasing finite ranges between −10000 and 10000.",
        );
      if (!text.trim()) throw new Error("Enter a challenge first.");
      let q: Question;
      if (mode === "network") q = customNetwork(text, format);
      else if (practice)
        q = {
          mode,
          id: `practice-${Date.now()}`,
          family: "unmarked practice",
          title: text,
          detail:
            "Unmarked practice. No reference overlay or verified features are available.",
          view,
          reference: [],
          features: emptyFeatures(),
          properties: [],
          practiceOnly: true,
          explanation:
            "Your drawing is available for review, but this expression is not automatically marked.",
        };
      else if (mode === "function") {
        let d: [number, number] | undefined;
        if (domain.trim()) {
          const parts = domain.split(",").map(Number);
          if (
            parts.length !== 2 ||
            !parts.every(Number.isFinite) ||
            parts[0] >= parts[1]
          )
            throw new Error("Use two domain endpoints, for example 0.1, 6.");
          d = [parts[0], parts[1]];
        }
        const { customFunction } = await import("./math/customFunction");
        q = customFunction(text, view, d);
      } else q = customComplex(text, view);
      onStart(q);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal custom-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close icon-btn"
          aria-label="Close custom challenge"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="eyebrow">YOUR OWN EXPLORATION</span>
        <h2 id="custom-title">Custom {names[mode].toLowerCase()}</h2>
        <p>
          One challenge, at your own pace. Custom scores stay separate from your
          personal best.
        </p>
        {mode === "network" && (
          <label>
            Input format
            <select
              value={format}
              onChange={(e) => {
                const f = e.target.value as typeof format;
                setFormat(f);
                setText(
                  f === "matrix"
                    ? "0 1 0\n1 0 1\n0 1 0"
                    : f === "edges"
                      ? "A-B, B-C, D"
                      : "3, 3, 2, 2, 2",
                );
              }}
            >
              <option value="matrix">Adjacency matrix</option>
              <option value="edges">Edge list</option>
              <option value="degrees">Degree sequence</option>
            </select>
          </label>
        )}
        <label>
          {mode === "function"
            ? "Expression in x"
            : mode === "complex"
              ? "Complex equation or region"
              : "Graph specification"}
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={mode === "network" ? 4 : 2}
          />
        </label>
        {mode === "function" && (
          <>
            <p className="field-help">
              Use + − * / ^, sin, cos, tan, exp, log, sqrt, abs, asin, acos,
              atan, sinh, cosh, pi and e. Example: log(x)/x.
            </p>
            <label>
              Optional domain interval
              <input
                placeholder="e.g. 0.1, 10"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </label>
          </>
        )}
        {mode === "complex" && (
          <p className="field-help">
            Automatic checking supports |z| &lt;= 2, |z-(2+1i)| = 3, Re(z) &gt;
            1, and Im(z) = -2. Use unmarked practice for other forms.
          </p>
        )}
        {mode !== "network" && (
          <div className="range-form">
            {(["xmin", "xmax", "ymin", "ymax"] as const).map((key) => (
              <label key={key}>
                {key}
                <input
                  type="number"
                  step="any"
                  value={view[key]}
                  onChange={(e) =>
                    setView({ ...view, [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button" onClick={() => start()}>
            Start challenge <ArrowRight />
          </button>
          {mode !== "network" && (
            <button className="button secondary" onClick={() => start(true)}>
              Unmarked practice
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
export default function App() {
  const [theme, setTheme] = useState(getTheme);
  const [page, setPage] = useState<
    "home" | "play" | "results" | "stats" | "review"
  >("home");
  const [mode, setMode] = useState<Mode>("function");
  const [difficulty, setDifficulty] = useState<Record<Mode, Difficulty>>({
    function: "Medium",
    network: "Medium",
    complex: "Medium",
  });
  const [history, setHistory] = useState(readHistory);
  const [custom, setCustom] = useState<Mode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [drawing, setDrawing] = useState<Item[]>([]);
  const [network, setNetwork] = useState<Network>(emptyNetwork);
  const [propertyTagIds, setPropertyTagIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<Answer | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<"leave" | "clear" | null>(null);
  const [about, setAbout] = useState(false);
  const [grading, setGrading] = useState(false);
  document.documentElement.dataset.theme = theme;
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("graphdle.theme", next);
    } catch {
      /* Theme still applies for the current session. */
    }
  };
  const resetAnswer = () => {
    setDrawing([]);
    setNetwork(emptyNetwork);
    setPropertyTagIds([]);
    setSubmitted(null);
  };
  const start = (m: Mode, customQ?: Question) => {
    const seed =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setMode(m);
    setQuestions(
      customQ
        ? [customQ]
        : m === "function"
          ? functionGame(seed, difficulty[m])
          : m === "network"
            ? networkGame(seed, difficulty[m])
            : complexGame(seed, difficulty[m]),
    );
    setIndex(0);
    setAnswers([]);
    resetAnswer();
    setIsCustom(!!customQ);
    setCustom(null);
    setPage("play");
    setNotice("");
    window.scrollTo(0, 0);
  };
  const q = questions[index];
  const total = answers.reduce((sum, a) => sum + a.grade.score, 0);
  const filtered = history.filter((h) => h.mode === mode);
  const best = (m: Mode) =>
    Math.max(0, ...history.filter((h) => h.mode === m).map((h) => h.score));
  const submit = () => {
    if (grading || submitted) return;
    setGrading(true);
    window.setTimeout(() => {
      try {
        const properties = serializePropertyTags(propertyTagIds);
        const grade =
          q.mode === "network"
            ? gradeNetwork(q, network)
            : gradePlot(q, drawing, properties);
        const a = { question: q, drawing, network, properties, grade };
        setSubmitted(a);
        setAnswers((prev) => [...prev, a]);
      } catch {
        setNotice(
          "The answer could not be marked. Your drawing is safe; please try again.",
        );
      } finally {
        setGrading(false);
      }
    }, 35);
  };
  const next = () => {
    if (index === questions.length - 1) {
      if (!isCustom) {
        const entry: HistoryEntry = {
          id: questions[0].id,
          mode,
          difficulty: difficulty[mode],
          date: new Date().toISOString(),
          score: total,
          questions: answers.map((a) => ({
            family: a.question.family,
            score: a.grade.score,
            title: a.question.title,
          })),
        };
        const nextHistory = [...history, entry];
        setHistory(nextHistory);
        if (!saveHistory(nextHistory))
          setNotice(
            "Your browser could not save this result. Scores remain visible for this session.",
          );
      }
      setPage("results");
    } else {
      setIndex(index + 1);
      resetAnswer();
    }
    window.scrollTo(0, 0);
  };
  const goHome = () => {
    if (page === "play") setConfirm("leave");
    else setPage("home");
  };
  const review = answers[reviewIndex];
  const unmarked =
    questions.length === 1 &&
    questions[0].mode !== "network" &&
    questions[0].practiceOnly;
  return (
    <>
      <header className="site-header">
        <button
          className="wordmark"
          aria-label="Graphdle home"
          onClick={goHome}
        >
          <span className="logo">
            <Workflow size={21} />
          </span>
          graphdle<span className="logo-dot">.</span>
        </button>
        <nav>
          <button
            className={page === "home" ? "nav-link active" : "nav-link"}
            onClick={goHome}
          >
            The games
          </button>
          <button
            className={page === "stats" ? "nav-link active" : "nav-link"}
            onClick={() => {
              if (page === "play") setConfirm("leave");
              else setPage("stats");
            }}
          >
            Your progress
          </button>
          <button
            className="icon-btn theme-toggle"
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </button>
        </nav>
      </header>
      <main>
        {page === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="hero-label">
                  <span className="status-dot" /> A LITTLE INTUITION. A LOT OF
                  MATHEMATICS.
                </div>
                <h1>
                  Find your <em>line.</em>
                </h1>
                <p>
                  Some things make more sense when you draw them.
                  <br className="desktop-break" /> Three games to sharpen your
                  mathematical intuition.
                </p>
                <div className="hero-meta">
                  <span>
                    <Check size={15} /> Five questions
                  </span>
                  <span>
                    <Check size={15} /> 500 points
                  </span>
                  <span>
                    <Check size={15} /> No rush
                  </span>
                </div>
              </div>
              <div className="hero-art">
                <div className="formula top-formula">
                  a little sketch goes a long way
                </div>
                <Illustration mode="function" hero />
                <span className="hand-note">
                  think it. draw it. understand it.
                </span>
                <div className="art-badge">
                  <span>∞</span> room to explore
                </div>
              </div>
            </section>
            <section className="games-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">THREE WAYS TO THINK</span>
                  <h2>Choose your plane of thought.</h2>
                </div>
                <span className="section-note">
                  Independent games. Endless possibilities.
                </span>
              </div>
              <div className="game-cards">
                {modes.map((m, i) => {
                  const games = history.filter((h) => h.mode === m);
                  return (
                    <article className={`game-card ${m}`} key={m}>
                      <div className="card-topline">
                        <span className="game-number">
                          0{i + 1} /{" "}
                          {m === "function"
                            ? "CARTESIAN"
                            : m === "network"
                              ? "NETWORKS"
                              : "ARGAND"}
                        </span>
                        <span className="card-icon">{modeIcons[m]}</span>
                      </div>
                      <Illustration mode={m} />
                      <h3>{names[m]}</h3>
                      <p>{descriptions[m]}</p>
                      <div className="card-difficulty">
                        <label htmlFor={`difficulty-${m}`}>Difficulty</label>
                        <select
                          id={`difficulty-${m}`}
                          value={difficulty[m]}
                          onChange={(e) =>
                            setDifficulty({
                              ...difficulty,
                              [m]: e.target.value as Difficulty,
                            })
                          }
                        >
                          {difficulties.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="button card-play"
                        onClick={() => start(m)}
                      >
                        Let's play <ArrowUpRight size={18} />
                      </button>
                      <div className="card-bottom">
                        <button onClick={() => setCustom(m)}>
                          Custom challenge <Settings2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setMode(m);
                            setPage("stats");
                          }}
                        >
                          {games.length
                            ? `Best ${best(m)}/500`
                            : "No scores yet"}{" "}
                          <ChevronRight size={13} />
                        </button>
                      </div>
                      {games.length > 0 && (
                        <div className="last-score">
                          Last game: {games[games.length - 1].score}/500 ·{" "}
                          {games[games.length - 1].difficulty}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="how-section">
              <div className="how-intro">
                <BookOpen />
                <h3>
                  Less memorising.
                  <br />
                  More understanding.
                </h3>
                <p>
                  From your first quadratic to an interview curveball. Build
                  intuition one sketch at a time.
                </p>
              </div>
              {[
                {
                  n: "01",
                  title: "Meet your challenge",
                  text: "Five fresh questions, generated for your game and difficulty.",
                },
                {
                  n: "02",
                  title: "Make your mark",
                  text: "Draw, connect, or shade. Take your time and trust the mathematics.",
                },
                {
                  n: "03",
                  title: "See the bigger picture",
                  text: "Compare your answer, learn from the feedback, and watch your progress.",
                },
              ].map((s) => (
                <div className="how-step" key={s.n}>
                  <span>{s.n}</span>
                  <h4>{s.title}</h4>
                  <p>{s.text}</p>
                </div>
              ))}
            </section>
            <div className="privacy-strip">
              <span>
                Made for curious minds, from A-level to interview prep.
              </span>
              <span>No account. No timer. Just you and the graph.</span>
            </div>
          </>
        )}
        {page === "play" && q && (
          <div className="play-page">
            <button className="back-link" onClick={goHome}>
              <ArrowLeft size={15} /> All games
            </button>
            <div className="play-heading">
              <div>
                <span className="eyebrow">
                  {names[mode]}{" "}
                  <span className="pill">
                    {isCustom ? "Custom" : difficulty[mode]}
                  </span>
                </span>
                <h1>{taglines[mode]}</h1>
              </div>
              <div className="score-pill">
                <span>YOUR SCORE</span>
                <b>
                  {total}
                  <small> / {answers.length * 100}</small>
                </b>
              </div>
            </div>
            <div className="progress-row">
              <span>
                {isCustom ? "Custom challenge" : `Question ${index + 1} of 5`}
              </span>
              <div className="progress-segments">
                {questions.map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < index ? "done" : i === index ? "current" : ""
                    }
                  />
                ))}
              </div>
              <span>
                {isCustom
                  ? "Outside standard scores"
                  : "100 points per question"}
              </span>
            </div>
            <section className="challenge">
              <span className="challenge-label">
                {q.mode === "network"
                  ? "BUILD THIS GRAPH"
                  : q.mode === "function"
                    ? "SKETCH THIS CURVE"
                    : "DRAW THIS LOCUS"}
              </span>
              <h2>{q.title}</h2>
              <p>{q.detail}</p>
              {q.mode === "function" && !q.curveOnly && !q.practiceOnly && (
                <p className="feature-instructions">
                  Corners and cusps are recognised from your sketch
                  automatically. Use purple stars for smooth turning points,
                  triangles for x-intercepts, and circles for y-intercepts. At a
                  smooth extremum that is also an intercept, place both markers.
                </p>
              )}
              {q.mode === "network" && <NetworkPrompt question={q} />}
            </section>
            <div className={`play-layout ${submitted ? "has-feedback" : ""}`}>
              <div className="answer-workspace">
                {q.mode === "network" ? (
                  <NetworkCanvas
                    key={q.id}
                    onChange={setNetwork}
                    locked={!!submitted}
                  />
                ) : (
                  <Plane
                    key={q.id}
                    question={q}
                    onChange={setDrawing}
                    locked={!!submitted}
                    solution={!!submitted}
                  />
                )}
                {q.mode === "function" && !q.curveOnly && !q.practiceOnly && (
                  <PropertyPicker
                    key={q.id}
                    selected={propertyTagIds}
                    onChange={setPropertyTagIds}
                    disabled={!!submitted}
                  />
                )}
                {!submitted && (
                  <div className="submit-row">
                    <span>
                      {q.mode === "network"
                        ? "Structure matters. Arrangement is up to you."
                        : "Take your time. You can undo any mark."}
                    </span>
                    <button
                      className="button"
                      disabled={grading}
                      onClick={submit}
                    >
                      {grading
                        ? "Checking…"
                        : q.mode !== "network" && q.practiceOnly
                          ? "Finish practice"
                          : "Check my answer"}{" "}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                )}
              </div>
              {submitted && (
                <aside>
                  <ScoreFeedback answer={submitted} />
                  {q.mode === "network" && (
                    <div className="reference-network">
                      <h3>One correct construction</h3>
                      <NetworkCanvas initial={q.answer} locked compact />
                    </div>
                  )}
                  <button className="button next-button" onClick={next}>
                    {index === questions.length - 1
                      ? "See results"
                      : "Next question"}
                    <ArrowRight size={17} />
                  </button>
                </aside>
              )}
            </div>
            <div className="seed">
              Question ID: {q.id} · {q.family}
            </div>
          </div>
        )}
        {page === "results" && (
          <section className="results-page">
            <span className="eyebrow">
              {isCustom
                ? "CUSTOM CHALLENGE COMPLETE"
                : `${names[mode]} · ${difficulty[mode]}`}
            </span>
            <div className="result-emblem">
              <Trophy size={30} />
            </div>
            <h1>
              {isCustom ? "A little more intuition." : performance(total) + "."}
            </h1>
            <p>
              {isCustom
                ? "Your custom result does not affect your personal best."
                : "Five questions. A fresh perspective. Here’s how you did."}
            </p>
            <div className="result-score">
              {unmarked ? "Unmarked" : total}
              {!unmarked && <span> / {questions.length * 100}</span>}
            </div>
            <div className="result-meta">
              {!unmarked && (
                <span>{Math.round(total / questions.length)}% accuracy</span>
              )}
              {!isCustom && total >= best(mode) && (
                <span>
                  <Trophy size={15} /> Personal best
                </span>
              )}
            </div>
            <div className="question-results">
              {answers.map((a, i) => (
                <button
                  key={a.question.id}
                  onClick={() => {
                    setReviewIndex(i);
                    setPage("review");
                  }}
                >
                  <span className="question-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <b>{a.question.title}</b>
                    <small>{a.question.family}</small>
                  </div>
                  <strong>
                    {unmarked ? "Practice" : a.grade.score}
                    {!unmarked && <small> / 100</small>}
                  </strong>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
            <div className="improvement">
              <h3>Your next step</h3>
              {unmarked ? (
                <p>
                  Review your drawing and compare it with your own mathematical
                  analysis. This practice prompt has no verified reference or
                  automated score.
                </p>
              ) : answers
                  .flatMap((a) => a.grade.breakdown)
                  .filter((b) => b.max > 0 && b.score < b.max * 0.65).length ? (
                <p>
                  Focus on{" "}
                  {[
                    ...new Set(
                      answers
                        .flatMap((a) => a.grade.breakdown)
                        .filter((b) => b.max > 0 && b.score < b.max * 0.65)
                        .map((b) => b.label.toLowerCase()),
                    ),
                  ].join(", ")}
                  . Open each question above to compare your answer and see
                  specific feedback.
                </p>
              ) : (
                <p>
                  Your answers showed strong understanding. Try the next
                  difficulty or a custom challenge to stretch your intuition.
                </p>
              )}
            </div>
            <div className="result-actions">
              <button
                className="button"
                onClick={() => (isCustom ? setCustom(mode) : start(mode))}
              >
                <RotateCcw size={17} />{" "}
                {isCustom ? "Another custom challenge" : "Play again"}
              </button>
              <button
                className="button secondary"
                onClick={() => setPage("home")}
              >
                All games
              </button>
            </div>
          </section>
        )}
        {page === "review" && review && (
          <section className="review-page">
            <button className="back-link" onClick={() => setPage("results")}>
              <ArrowLeft size={15} /> Back to results
            </button>
            <span className="eyebrow">QUESTION {reviewIndex + 1} REVIEW</span>
            <h2>{review.question.title}</h2>
            <div className="play-layout has-feedback">
              <div>
                {review.question.mode === "network" ? (
                  <>
                    <h3>Your construction</h3>
                    <NetworkCanvas initial={review.network} locked />
                    <h3>One correct construction</h3>
                    <NetworkCanvas
                      initial={review.question.answer}
                      locked
                      compact
                    />
                  </>
                ) : (
                  <Plane
                    key={`review-${review.question.id}`}
                    question={review.question}
                    initial={review.drawing}
                    locked
                    solution
                  />
                )}
              </div>
              <ScoreFeedback answer={review} />
            </div>
          </section>
        )}
        {page === "stats" && (
          <section className="stats-page">
            <span className="eyebrow">YOUR MATHEMATICAL JOURNEY</span>
            <h1>Progress, one graph at a time.</h1>
            <div className="mode-tabs" role="tablist">
              {modes.map((m) => (
                <button
                  role="tab"
                  aria-selected={mode === m}
                  className={mode === m ? "active" : ""}
                  onClick={() => setMode(m)}
                  key={m}
                >
                  {modeIcons[m]}
                  {names[m]}
                </button>
              ))}
            </div>
            <div className="stat-grid">
              {[
                {
                  label: "Personal best",
                  value: filtered.length ? `${best(mode)}/500` : "—",
                },
                {
                  label: "Average score",
                  value: filtered.length
                    ? `${Math.round(filtered.reduce((s, h) => s + h.score, 0) / filtered.length)}/500`
                    : "—",
                },
                { label: "Games completed", value: filtered.length },
                {
                  label: "Questions explored",
                  value: filtered.reduce((s, h) => s + h.questions.length, 0),
                },
              ].map((s) => (
                <div key={s.label}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
            {filtered.length ? (
              <>
                <div className="stats-columns">
                  <section>
                    <h3>Recent form</h3>
                    <div className="history-bars">
                      {filtered.slice(-15).map((h) => (
                        <div
                          key={h.id}
                          title={`${new Date(h.date).toLocaleDateString()}: ${h.score}/500`}
                        >
                          <span>{h.score}</span>
                          <i
                            style={{
                              height: `${Math.max(2, (h.score / 500) * 120)}px`,
                            }}
                          />
                          <small>
                            {new Date(h.date).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                            })}
                          </small>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3>Accuracy by family</h3>
                    {[
                      ...new Set(
                        filtered.flatMap((h) =>
                          h.questions.map((q) => q.family),
                        ),
                      ),
                    ].map((f) => {
                      const qs = filtered
                          .flatMap((h) => h.questions)
                          .filter((q) => q.family === f),
                        avg = Math.round(
                          qs.reduce((s, q) => s + q.score, 0) / qs.length,
                        );
                      return (
                        <div className="category-stat" key={f}>
                          <span>{f}</span>
                          <progress max="100" value={avg} />
                          <b>{avg}%</b>
                        </div>
                      );
                    })}
                  </section>
                </div>
                <h3>Game history</h3>
                <div className="history-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Difficulty</th>
                        <th>Score</th>
                        <th>Question scores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filtered].reverse().map((h) => (
                        <tr key={h.id}>
                          <td>
                            {new Date(h.date).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>{h.difficulty}</td>
                          <td>{h.score}/500</td>
                          <td>{h.questions.map((q) => q.score).join(" · ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="text-button clear-history"
                  onClick={() => setConfirm("clear")}
                >
                  Clear {names[mode]} history
                </button>
              </>
            ) : (
              <div className="empty-state">
                <ChartNoAxesCombined size={36} />
                <h2>Every graph is a starting point.</h2>
                <p>Finish a five-question game to see your progress here.</p>
                <button className="button" onClick={() => start(mode)}>
                  Play {names[mode]} <ArrowRight size={17} />
                </button>
              </div>
            )}
            <p className="local-note">
              Saved in this browser only. Up to 200 completed games are
              retained. Custom challenges are excluded.
            </p>
          </section>
        )}
        {notice && (
          <div className="notice global-notice" role="status">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              <X size={14} />
            </button>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span className="footer-logo">graphdle.</span>
        <span>Mathematics, by hand.</span>
        <div>
          <button onClick={() => setAbout(true)}>How marking works</button>
          <a
            href="https://github.com/2319bli/graphdle"
            target="_blank"
            rel="noreferrer"
          >
            View source <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
      {custom && (
        <CustomDialog
          mode={custom}
          onClose={() => setCustom(null)}
          onStart={(q) => start(custom, q)}
        />
      )}
      {confirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title">
              {confirm === "leave" ? "Leave this game?" : "Clear this history?"}
            </h2>
            <p>
              {confirm === "leave"
                ? "This unfinished game and its drawings will be lost. Completed scores are saved."
                : `This removes locally saved ${names[mode]} scores. Other games are unaffected.`}
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="button"
                onClick={() => {
                  if (confirm === "leave") setPage("home");
                  else {
                    const nextHistory = history.filter((h) => h.mode !== mode);
                    setHistory(nextHistory);
                    if (!saveHistory(nextHistory))
                      setNotice(
                        "History was cleared for this session but browser storage could not be updated.",
                      );
                  }
                  setConfirm(null);
                }}
              >
                {confirm === "leave" ? "Leave game" : "Clear history"}
              </button>
            </div>
          </section>
        </div>
      )}
      {about && (
        <div className="modal-backdrop" onClick={() => setAbout(false)}>
          <section
            className="modal about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-btn"
              aria-label="Close marking guide"
              onClick={() => setAbout(false)}
            >
              <X />
            </button>
            <span className="eyebrow">CLEAR, EXPLAINABLE MARKING</span>
            <h2 id="about-title">The mathematics behind the marks.</h2>
            <p>
              <b>Functions:</b> 40 points for the curve, 15 each for intercepts,
              turning points, asymptotes, and properties. Corners and cusps are
              recognised from the sketch; smooth turning points require a purple
              star. Missing feature categories redistribute points to the curve.
              Holes and endpoints use 10 curve points when needed. Markers refer
              only to the original assessment window.
            </p>
            <p>
              Curve scores compare mathematical geometry in both directions with
              a freehand tolerance of 2.5% of each original axis range. Extra
              strokes and missing branches reduce the score. Panning or zooming
              never changes the assessment window.
            </p>
            <p>
              <b>Networks:</b> marks use vertex labels and edges, or the stated
              degree, connectivity, cycle, regularity and bipartite constraints.
              Different valid arrangements earn equal credit.
            </p>
            <p>
              <b>Complex loci:</b> marks check the locus geometry, shaded set,
              solid/dashed boundaries and any excluded points. Region accuracy
              uses a fixed mathematical sampling grid.
            </p>
            <p>
              <b>Limits:</b> numerical drawing scores are revision feedback, not
              a formal proof. Custom functions receive curve-only checking;
              arbitrary implicit equations and highly oscillatory custom
              expressions are best explored in unmarked practice. Written
              property tags use a fixed searchable vocabulary. Suggestions are
              the same for every question; mathematical correctness is checked
              only after submission. Properties that cannot be established for
              that question remain unverified.
            </p>
            <p>
              All three games are independent, generated locally and free of
              accounts or external scoring services.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
