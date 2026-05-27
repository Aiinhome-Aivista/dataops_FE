/**
 * KnowledgeGraph page
 * ───────────────────
 * Three sections:
 *   1. Stats bar          — node/edge counts per collection
 *   2. Fix Recommender    — paste an error, get graph-ranked candidates
 *   3. Runbook Subgraph   — pick a runbook_id, see its local neighbourhood
 *                            rendered as a simple force-free SVG
 *
 * No external graph libraries needed — the layout is a deterministic
 * radial layout that's plenty for the small 1-hop subgraphs we render.
 * If you want fancier visuals later, swap in react-flow / cytoscape.
 */

import { useEffect, useMemo, useState } from "react";
import {
  graphApi,
  type FixCandidate,
  type GraphStats,
  type Subgraph,
} from "../services/graphApi";


export default function KnowledgeGraphPage() {
  const [stats, setStats] = useState<GraphStats | null>(null);

  useEffect(() => { graphApi.stats().then(setStats).catch(() => setStats(null)); }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8 overflow-y-auto h-full">
      <header className="flex items-end justify-between border-b border-zinc-850 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800">Knowledge Graph</h1>
          <p className="text-sm text-zinc-500">
            Runbooks distilled into a graph of error patterns, fix actions
            and incident outcomes. Used to rank fix suggestions at diagnosis time.
          </p>
        </div>
        {stats && (
          <span className={`rounded-full px-3 py-1 text-xs ring-1 ${
            stats.enabled
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-red-200"
          }`}>
            {stats.enabled ? "ArangoDB connected" : "ArangoDB offline"}
          </span>
        )}
      </header>

      <StatsBar stats={stats} />
      <RecommendPanel />
      <SubgraphPanel />
    </div>
  );
}


/* ─────────────────────── 1. Stats bar ─────────────────────── */

function StatsBar({ stats }: { stats: GraphStats | null }) {
  if (!stats) return null;
  const VERTEX = ["runbooks", "error_patterns", "fix_actions",
                  "components", "incidents", "pipelines"];
  const EDGE   = ["runbook_addresses", "runbook_has_step", "runbook_applies_to",
                  "pattern_uses_fix", "incident_matched", "incident_used_fix",
                  "pattern_similar_to", "pipeline_uses"];

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
        Vertices
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {VERTEX.map(k => (
          <Counter key={k} label={k} value={stats.counts[k] ?? 0} accent="emerald" />
        ))}
      </div>
      <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase pt-2">
        Edges
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {EDGE.map(k => (
          <Counter key={k} label={k} value={stats.counts[k] ?? 0} accent="sky" />
        ))}
      </div>
    </section>
  );
}

function Counter({ label, value, accent }: {
  label: string; value: number; accent: "emerald" | "sky";
}) {
  const ring = accent === "emerald" ? "border-emerald-100 bg-emerald-50/30 text-emerald-800" : "border-sky-100 bg-sky-50/30 text-sky-800";
  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${ring}`}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label.replace(/_/g, " ")}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}


/* ──────────────────── 2. Recommend panel ───────────────────── */

function RecommendPanel() {
  const [errorText, setErrorText] = useState(
    "KeyError: 'id' in transform_customers task during ADF copy activity",
  );
  const [component, setComponent] = useState("");
  const [topK, setTopK] = useState(5);
  const [busy, setBusy] = useState(false);
  const [out, setOut]   = useState<FixCandidate[] | null>(null);
  const [err, setErr]   = useState<string | null>(null);

  const run = async () => {
    if (!errorText.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await graphApi.recommend(errorText, component || undefined, topK);
      setOut(r.candidates);
      if (!r.enabled) setErr("Graph layer is disabled.");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
        Fix Recommender
      </h2>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <textarea
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
          placeholder="Paste the error message + a few log lines…"
          rows={4}
          className="w-full rounded-lg border border-zinc-300 bg-[#F9FAFB] px-3.5 py-2.5
                     text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none
                     focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]"
        />
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-600">
          <label className="flex items-center gap-2">
            Component:
            <input
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              placeholder="e.g. Databricks"
              className="rounded-lg border border-zinc-300 bg-[#F9FAFB] px-3 py-1.5
                         text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]"
            />
          </label>
          <label className="flex items-center gap-2">
            Top K:
            <input
              type="number" min={1} max={20}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
              className="w-16 rounded-lg border border-zinc-300 bg-[#F9FAFB] px-3 py-1.5
                         text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]"
            />
          </label>
          <button
            onClick={run}
            disabled={busy}
            className="ml-auto rounded-lg bg-[#111827] px-5 py-2 text-white font-semibold
                       hover:bg-[#1F2937] transition-all disabled:opacity-50"
          >
            {busy ? "Querying…" : "Recommend"}
          </button>
        </div>

        {err && <div className="text-sm text-red-500 font-medium">{err}</div>}

        {out && out.length === 0 && (
          <div className="text-sm text-zinc-500 italic">
            No matches. The graph may not have ingested enough runbooks yet —
            upload more, or check that ARANGO_ENABLED=true.
          </div>
        )}

        {out && out.length > 0 && (
          <ol className="space-y-3 pt-2">
            {out.map((c, i) => (
              <li key={c.fix_id}
                  className="rounded-lg border border-zinc-200 bg-[#F9FAFB]/50 p-4 shadow-xs">
                <div className="flex items-start gap-4">
                  <span className="rounded-full bg-emerald-50 text-emerald-700 text-xs
                                   font-bold px-3 py-1 border border-emerald-100">
                    #{i + 1} · Score: {c.score.toFixed(1)}
                  </span>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-zinc-800">{c.fix}</div>
                    <div className="mt-2 text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Patterns:</strong> {c.matched_patterns.join(", ") || "—"}</span>
                      <span><strong>Runbooks:</strong> {c.supporting_runbooks.join(", ") || "—"}</span>
                      <span>
                        <strong>Feedback Loop:</strong>&nbsp;
                        <span className="text-emerald-600 font-semibold">{c.success_count}↑ success</span>
                        &nbsp;·&nbsp;
                        <span className="text-red-500 font-semibold">{c.failure_count}↓ failure</span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}


/* ─────────────────── 3. Subgraph viewer ───────────────────── */

function SubgraphPanel() {
  const [rid, setRid] = useState("");
  const [sg, setSg]   = useState<Subgraph | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!rid.trim()) return;
    setErr(null);
    setLoading(true);
    try { 
      const res = await graphApi.subgraph(rid); 
      setSg(res); 
    }
    catch (e: any) { 
      setErr(e?.message ?? String(e)); 
      setSg(null); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
        Runbook Subgraph
      </h2>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-xs font-medium">
          <input
            value={rid}
            onChange={(e) => setRid(e.target.value)}
            placeholder="runbook_id (e.g. 1)"
            className="flex-1 rounded-lg border border-zinc-300 bg-[#F9FAFB] px-3.5 py-2
                       text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#111827]/10 focus:border-[#111827]"
          />
          <button onClick={load} disabled={loading}
            className="rounded-lg bg-zinc-100 border border-zinc-300 hover:bg-zinc-200 px-5 py-2 text-zinc-700 font-semibold transition-all">
            {loading ? "Loading..." : "Load Subgraph"}
          </button>
        </div>
        {err && <div className="text-sm text-red-500 font-medium">{err}</div>}
        {sg && (sg.nodes.length === 0
          ? <div className="text-sm text-zinc-500 italic">No subgraph found for that runbook ID.</div>
          : <SubgraphSVG sg={sg} />
        )}
      </div>
    </section>
  );
}

function SubgraphSVG({ sg }: { sg: Subgraph }) {
  // Deterministic radial layout: centre node first, neighbours on a circle.
  const layout = useMemo(() => {
    const W = 720, H = 360, cx = W / 2, cy = H / 2, R = 110;
    const idToXY: Record<string, { x: number; y: number }> = {};
    const neighbours = sg.nodes.slice(1);
    if (sg.nodes[0]) idToXY[sg.nodes[0].id] = { x: cx, y: cy };
    neighbours.forEach((n, i) => {
      const t = (i / Math.max(neighbours.length, 1)) * Math.PI * 2;
      idToXY[n.id] = { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) };
    });
    return { W, H, idToXY };
  }, [sg]);

  const COLOR: Record<string, string> = {
    runbooks:       "#10b981",
    error_patterns: "#f97316",
    fix_actions:    "#38bdf8",
    components:     "#a78bfa",
    incidents:      "#ef4444",
    pipelines:      "#facc15",
  };

  return (
    <div className="relative border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50/50 p-2">
      <svg viewBox={`0 0 ${layout.W} ${layout.H}`}
           className="w-full h-auto">
        {/* edges */}
        {sg.edges.map((e, i) => {
          const a = layout.idToXY[e.from], b = layout.idToXY[e.to];
          if (!a || !b) return null;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="4 4" />
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}
                    fill="#4B5563" fontSize={9} fontWeight="600" textAnchor="middle">
                {e.label}
              </text>
            </g>
          );
        })}
        {/* nodes */}
        {sg.nodes.map((n) => {
          const p = layout.idToXY[n.id]; if (!p) return null;
          return (
            <g key={n.id} className="cursor-pointer group">
              <circle cx={p.x} cy={p.y} r={16}
                      fill={COLOR[n.type] ?? "#9ca3af"} className="stroke-white stroke-2 shadow-sm transition-all duration-250 group-hover:scale-110" />
              <text x={p.x} y={p.y + 32} fill="#1F2937"
                    className="font-medium pointer-events-none"
                    fontSize={10} textAnchor="middle">
                {n.label.length > 25 ? n.label.slice(0, 24) + "…" : n.label}
              </text>
              <text x={p.x} y={p.y + 3.5} fill="#ffffff"
                    className="font-bold pointer-events-none"
                    fontSize={9} textAnchor="middle">
                {n.type[0].toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs border border-zinc-200 rounded-md p-2 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 shadow-xs">
        {Object.entries(COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span>{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
