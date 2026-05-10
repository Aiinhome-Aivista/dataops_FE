import { useMemo } from "react";
import {
  Activity,
  ArrowLeft,
  Clock,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Workflow,
} from "lucide-react";
import { Header } from "../Header";
import { PipelineDAG } from "../PipelineDAG";
import { PipelineStatusBadge } from "../Badges";
import { useStore } from "../../hooks/useStore";
import { cn, timeAgo } from "../../lib/utils";
import type { Pipeline } from "../../types";

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function MetricCard({
  label,
  value,
  children,
  accent = "gray",
}: {
  label: string;
  value?: string | number;
  children?: React.ReactNode;
  accent?: "blue" | "emerald" | "rose" | "gray";
}) {
  const accentMap = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    gray: "text-[#111827]",
  };
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">
        {label}
      </div>
      <div className={cn("text-xl font-bold tabular-nums", accentMap[accent])}>
        {children ?? value ?? "—"}
      </div>
    </div>
  );
}

interface PipelineDetailProps {
  pipeline: Pipeline;
  onBack: () => void;
  onViewRun: (id: string) => void;
}

export function PipelineDetail({
  pipeline,
  onBack,
  onViewRun,
}: PipelineDetailProps) {
  const { state } = useStore();

  // Calculations
  const runs = pipeline.runs || [];
  const completedRuns = runs.filter(
    (r) => r.status === "SUCCEEDED" || r.status === "FAILED",
  );
  const successCount = runs.filter((r) => r.status === "SUCCEEDED").length;
  const successRate = completedRuns.length
    ? Math.round((successCount / completedRuns.length) * 100)
    : null;

  const avgDuration = useMemo(() => {
    const durations = runs
      .filter((r) => r.duration_seconds != null)
      .map((r) => r.duration_seconds as number);
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [runs]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <Header
        title={pipeline.name}
        subtitle={`// PIPELINE · ID=${pipeline.id}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:text-[#111827] flex items-center gap-2 transition-all"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              onClick={onBack}
              className="bg-white border border-[#E5E7EB] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:bg-gray-50 flex items-center gap-2 transition-all"
            >
              <ArrowLeft size={12} /> Catalog
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Last Status">
              <PipelineStatusBadge
                status={pipeline.last_run_status || pipeline.status}
              />
            </MetricCard>
            <MetricCard label="Total Runs (Recent)" value={runs.length} />
            <MetricCard
              label="Success Rate"
              value={successRate != null ? `${successRate}%` : "—"}
              accent={
                successRate != null
                  ? successRate < 80
                    ? "rose"
                    : "emerald"
                  : "gray"
              }
            />
            <MetricCard
              label="Avg Duration"
              value={formatDuration(avgDuration)}
            />
          </div>

          {/* Run History Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Run History
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                Latest {runs.length} Runs
              </span>
            </div>

            <div className="overflow-x-auto">
              {runs.length === 0 ? (
                <div className="py-20 text-center">
                  <Clock className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
                  <p className="text-xs text-[#9CA3AF] font-medium">
                    No run history found for this pipeline.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F9FAFB] text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#F3F4F6]">
                      <th className="px-6 py-3">Run ID</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Started</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Analysis</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {runs.map((run) => (
                      <tr
                        key={run.id}
                        className="hover:bg-[#F9FAFB] transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                            {run.external_run_id?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <PipelineStatusBadge status={run.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#4B5563]">
                              {new Date(run.started_at).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#9CA3AF] font-medium">
                              {timeAgo(run.started_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-medium text-[#4B5563]">
                            {formatDuration(run.duration_seconds)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {run.analysis ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase tracking-tight">
                              <Sparkles size={10} /> Available
                            </span>
                          ) : run.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-100 uppercase tracking-tight">
                              <AlertCircle size={10} /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF] font-mono">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onViewRun(run.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-all"
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Topology Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Workflow size={14} className="text-[#9CA3AF]" />
              <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                Topology · Directed Acyclic Graph
              </h3>
            </div>
            <PipelineDAG nodes={pipeline.dag} orientation="horizontal" />
          </div>
        </div>
      </div>
    </div>
  );
}
