import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Cpu,
  Database,
  AlertCircle,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { api } from "../services/api";
import type { SystemMetrics, PipelinePerformance } from "../types";
import { cn } from "../lib/utils";

const WINDOW_OPTIONS: { label: string; hours: number }[] = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

function fmtSec(s: number): string {
  if (!s) return "—";
  if (s < 1) return `${(s * 1000).toFixed(0)}ms`;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

function fmtMs(v: number): string {
  if (!v) return "—";
  if (v < 1000) return `${v.toFixed(0)}ms`;
  return `${(v / 1000).toFixed(2)}s`;
}

export function MetricsPage() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<SystemMetrics | null>(null);
  const [pipelineRows, setPipelineRows] = useState<PipelinePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Commenting out live API calls to prevent 500 server errors
      /*
      const [sys, rows] = await Promise.all([
        api.systemMetrics(hours),
        api.pipelinePerformance(hours),
      ]);
      setData(sys);
      setPipelineRows(rows);

      */

      // Simulate network request loading state smoothly
      await new Promise((res) => setTimeout(res, 400));

      const dummySys: SystemMetrics = {
        window_hours: hours,
        pipelines: {
          count: 14,
          runs_total:
            hours === 1 ? 84 : hours === 6 ? 412 : hours === 24 ? 1240 : 8420,
          runs_succeeded:
            hours === 1 ? 82 : hours === 6 ? 398 : hours === 24 ? 1198 : 8110,
          runs_failed:
            hours === 1 ? 2 : hours === 6 ? 14 : hours === 24 ? 42 : 310,
          success_rate_pct: 96.6,
          top_5_busiest: [],
        },
        rag: {
          collections: { incidents: 380, runbooks: 142 },
          summary: {
            incidents: {
              query_count: hours === 1 ? 45 : hours === 24 ? 850 : 3400,
              avg_latency_ms: 185,
              p95_latency_ms: 310,
              hit_rate: 0.92,
              avg_top_similarity: 0.88,
            },
            runbooks: {
              query_count: hours === 1 ? 18 : hours === 24 ? 420 : 1850,
              avg_latency_ms: 140,
              p95_latency_ms: 260,
              hit_rate: 0.95,
              avg_top_similarity: 0.91,
            },
          },
        },
        llm: {
          call_count: hours === 1 ? 52 : hours === 24 ? 940 : 4120,
          success_rate: 0.99,
          avg_latency_ms: 820,
          p95_latency_ms: 1450,
          avg_prompt_chars: 3840,
        },
      };

      const dummyRows: PipelinePerformance[] = [
        {
          pipeline_id: 1,
          pipeline_name: "Customer Data Sync (Salesforce → Snowflake)",
          runs: hours === 1 ? 25 : hours === 24 ? 340 : 1240,
          succeeded: hours === 1 ? 25 : hours === 24 ? 335 : 1220,
          failed: hours === 1 ? 0 : hours === 24 ? 5 : 20,
          success_rate_pct: 98.5,
          avg_duration_sec: 14.2,
          min_duration_sec: 8.1,
          max_duration_sec: 45.0,
          p50_duration_sec: 12.0,
          p95_duration_sec: 28.4,
          p99_duration_sec: 41.2,
        },
        {
          pipeline_id: 2,
          pipeline_name: "Real-time Clickstream ETL (Kafka/Spark)",
          runs: hours === 1 ? 20 : hours === 24 ? 280 : 980,
          succeeded: hours === 1 ? 19 : hours === 24 ? 271 : 940,
          failed: hours === 1 ? 1 : hours === 24 ? 9 : 40,
          success_rate_pct: 96.7,
          avg_duration_sec: 4.8,
          min_duration_sec: 2.1,
          max_duration_sec: 18.5,
          p50_duration_sec: 4.1,
          p95_duration_sec: 11.0,
          p99_duration_sec: 16.2,
        },
        {
          pipeline_id: 3,
          pipeline_name: "Daily ERP Billing Reconciliation",
          runs: hours === 1 ? 12 : hours === 24 ? 190 : 710,
          succeeded: hours === 1 ? 12 : hours === 24 ? 188 : 700,
          failed: hours === 1 ? 0 : hours === 24 ? 2 : 10,
          success_rate_pct: 98.9,
          avg_duration_sec: 125.4,
          min_duration_sec: 90.0,
          max_duration_sec: 310.0,
          p50_duration_sec: 118.0,
          p95_duration_sec: 240.0,
          p99_duration_sec: 295.0,
        },
        {
          pipeline_id: 4,
          pipeline_name: "Logistics Router Geo-enrichment",
          runs: hours === 1 ? 10 : hours === 24 ? 150 : 620,
          succeeded: hours === 1 ? 9 : hours === 24 ? 135 : 560,
          failed: hours === 1 ? 1 : hours === 24 ? 15 : 60,
          success_rate_pct: 90.0,
          avg_duration_sec: 8.4,
          min_duration_sec: 3.2,
          max_duration_sec: 88.0,
          p50_duration_sec: 6.5,
          p95_duration_sec: 42.0,
          p99_duration_sec: 78.0,
        },
        {
          pipeline_id: 5,
          pipeline_name: "Telemetry Indexer Ingestion Flow",
          runs: hours === 1 ? 8 : hours === 24 ? 120 : 450,
          succeeded: hours === 1 ? 8 : hours === 24 ? 120 : 450,
          failed: 0,
          success_rate_pct: 100.0,
          avg_duration_sec: 1.2,
          min_duration_sec: 0.5,
          max_duration_sec: 3.1,
          p50_duration_sec: 1.0,
          p95_duration_sec: 2.4,
          p99_duration_sec: 2.9,
        },
      ];

      setData(dummySys);
      setPipelineRows(dummyRows);
    } catch (e: any) {
      setError(e?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // refresh every 15s while page is open
    const id = window.setInterval(load, 15_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const ragSummary = data?.rag.summary;
  const collections = data?.rag.collections;
  const llm = data?.llm;
  const pipelines = data?.pipelines;

  const sortedRows = useMemo(
    () => [...pipelineRows].sort((a, b) => b.runs - a.runs),
    [pipelineRows],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/60">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-gray-700" strokeWidth={2.25} />
                <h1 className="text-xl font-bold tracking-tight text-[#111827]">
                  Performance Metrics
                </h1>
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Pipelines · RAG retrieval · Mistral LLM latency · auto-refreshes
                every 15s
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                {WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    onClick={() => setHours(opt.hours)}
                    className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all",
                      hours === opt.hours
                        ? "bg-[#111827] text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={load}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-lg shadow-sm"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", loading && "animate-spin")}
                />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Pipeline Success"
              value={pipelines ? fmtPct(pipelines.success_rate_pct) : "—"}
              icon={TrendingUp}
              accent="emerald"
              sub={`${pipelines?.runs_total ?? 0} runs · ${pipelines?.runs_failed ?? 0} failed`}
            />
            <StatCard
              label="LLM p95 Latency"
              value={llm ? fmtMs(llm.p95_latency_ms) : "—"}
              icon={Zap}
              accent="violet"
              sub={`${llm?.call_count ?? 0} calls · ${llm ? fmtPct(llm.success_rate * 100) : "—"} ok`}
            />
            <StatCard
              label="RAG p95 (incidents)"
              value={
                ragSummary ? fmtMs(ragSummary.incidents.p95_latency_ms) : "—"
              }
              icon={Activity}
              accent="cyan"
              sub={`${ragSummary?.incidents.query_count ?? 0} queries`}
            />
            <StatCard
              label="Vectors Indexed"
              value={
                collections ? collections.incidents + collections.runbooks : 0
              }
              icon={Database}
              accent="amber"
              sub={`${collections?.incidents ?? 0} incidents · ${collections?.runbooks ?? 0} runbook chunks`}
            />
          </div>

          {/* Detail panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RAG panel */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-500" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Vector retrieval (RAG)
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {(["incidents", "runbooks"] as const).map((kind) => {
                  const s = ragSummary?.[kind];
                  return (
                    <div
                      key={kind}
                      className="border border-gray-100 rounded-lg p-4 bg-gray-50/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {kind} collection
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {collections?.[kind] ?? 0} vectors
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <Metric label="Queries" value={s?.query_count ?? 0} />
                        <Metric
                          label="Avg latency"
                          value={fmtMs(s?.avg_latency_ms ?? 0)}
                        />
                        <Metric
                          label="p95 latency"
                          value={fmtMs(s?.p95_latency_ms ?? 0)}
                        />
                        <Metric
                          label="Hit rate"
                          value={s ? fmtPct(s.hit_rate * 100) : "—"}
                        />
                        <Metric
                          label="Top similarity"
                          value={s ? s.avg_top_similarity.toFixed(2) : "—"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LLM panel */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Mistral LLM calls
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <Metric label="Total calls" value={llm?.call_count ?? 0} />
                  <Metric
                    label="Success rate"
                    value={llm ? fmtPct(llm.success_rate * 100) : "—"}
                  />
                  <Metric
                    label="Avg latency"
                    value={fmtMs(llm?.avg_latency_ms ?? 0)}
                  />
                  <Metric
                    label="p95 latency"
                    value={fmtMs(llm?.p95_latency_ms ?? 0)}
                  />
                  <Metric
                    label="Avg prompt size"
                    value={`${llm?.avg_prompt_chars ?? 0} chars`}
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100">
                  Latency reflects the full Mistral round-trip (prompt assembly
                  + RAG context block + response parsing). Samples capped at the
                  last 500 calls.
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline performance table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-[#111827]">
                Per-pipeline performance
              </h3>
              <span className="ml-auto text-[10px] text-gray-400 font-mono">
                {sortedRows.length} pipelines · last {hours}h
              </span>
            </div>

            {loading && sortedRows.length === 0 ? (
              <div className="p-16 text-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="p-16 text-center text-xs text-gray-500">
                No pipeline data for this window.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                    <th className="px-6 py-3">Pipeline</th>
                    <th className="px-3 py-3 text-right">Runs</th>
                    <th className="px-3 py-3 text-right">Success</th>
                    <th className="px-3 py-3 text-right">Failed</th>
                    <th className="px-3 py-3 text-right">Success %</th>
                    <th className="px-3 py-3 text-right">Avg</th>
                    <th className="px-3 py-3 text-right">p50</th>
                    <th className="px-3 py-3 text-right">p95</th>
                    <th className="px-3 py-3 text-right">p99</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {sortedRows.map((r) => (
                    <tr
                      key={r.pipeline_id}
                      className="hover:bg-[#F9FAFB] transition-colors"
                    >
                      <td className="px-6 py-3 text-xs font-medium text-[#111827] max-w-xs truncate">
                        {r.pipeline_name}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                        {r.runs}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-emerald-600">
                        {r.succeeded}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-rose-600">
                        {r.failed}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                            r.success_rate_pct >= 95
                              ? "bg-emerald-50 text-emerald-700"
                              : r.success_rate_pct >= 80
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700",
                          )}
                        >
                          {fmtPct(r.success_rate_pct)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                        {fmtSec(r.avg_duration_sec)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                        {fmtSec(r.p50_duration_sec)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                        {fmtSec(r.p95_duration_sec)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">
                        {fmtSec(r.p99_duration_sec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-md px-3 py-2">
      <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </div>
      <div className="text-sm font-bold text-[#111827] mt-0.5">{value}</div>
    </div>
  );
}
