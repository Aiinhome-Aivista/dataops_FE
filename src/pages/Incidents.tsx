import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Search,
  ShieldAlert,
  Terminal,
  ThumbsDown,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { LiveLogStream } from "../components/LiveLogStream";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { PipelineDAG } from "../components/PipelineDAG";
import { useStore } from "../hooks/useStore";
import { api } from "../services/api";
import { cn, formatTime, timeAgo } from "../lib/utils";
import { Loading } from "../components/Loading";
import type { Incident, MemoryEntry } from "../types";

const LOOP_STAGES = [
  {
    id: "detected",
    label: "Observe",
    icon: ActivityIcon,
    statuses: ["Detected"],
  },
  { id: "reasoning", label: "Reason", icon: Brain, statuses: ["Reasoning"] },
  {
    id: "planning",
    label: "Plan",
    icon: GitBranch,
    statuses: ["Planning", "Awaiting Approval"],
  },
  { id: "executing", label: "Act", icon: Wrench, statuses: ["Executing"] },
  {
    id: "evaluating",
    label: "Evaluate",
    icon: CheckCircle2,
    statuses: ["Evaluating"],
  },
  {
    id: "remediated",
    label: "Learn",
    icon: Zap,
    statuses: ["Remediated", "Failed", "Escalated"],
  },
];

export function IncidentsPage() {
  const { state, approveIncident, rejectIncident } = useStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"open" | "all" | "closed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [clearMenu, setClearMenu] = useState(false);
  const [clearing, setClearing] = useState(false);

  const filtered = useMemo(() => {
    let list = [...state.incidents];
    if (filter === "open")
      list = list.filter(
        (i) => i.status !== "Remediated" && i.status !== "Escalated",
      );
    if (filter === "closed")
      list = list.filter(
        (i) => i.status === "Remediated" || i.status === "Escalated",
      );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.pipeline_name.toLowerCase().includes(q));
    }

    return list;
  }, [state.incidents, filter, searchQuery]);

  const selected = id ? state.incidents.find((i) => String(i.id) === String(id)) : null;

  const clear = async (scope: "closed" | "open" | "all") => {
    setClearMenu(false);
    const labels: Record<typeof scope, string> = {
      closed: "closed (Remediated/Escalated/Failed)",
      open: "open (Detected/Reasoning/Awaiting Approval/...)",
      all: "ALL",
    } as const;
    if (
      !confirm(
        `Permanently delete ${labels[scope]} incidents? This cannot be undone.`,
      )
    )
      return;
    setClearing(true);
    try {
      const r = await api.deleteIncidents({ status: scope });
      window.location.reload();
      console.info(`deleted ${r.deleted} incidents`);
    } catch (e: any) {
      alert(`Clear failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      {state.isLoading && state.incidents.length === 0 ? (
        <Loading message="Syncing Incident Loop..." fullPage={false} />
      ) : (
        <main className="flex-1 overflow-hidden flex">
          {/* Incident sidebar */}
          <div className="w-[340px] border-r border-[#E5E7EB] bg-white flex flex-col shrink-0">
            <div className="p-5 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-1 mb-3">
                {(["open", "all", "closed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded transition-all",
                      filter === f
                        ? "bg-[#111827] text-white"
                        : "bg-gray-50 text-[#6B7280] hover:bg-gray-100",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="mb-3 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E7EB] rounded bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111827] transition-colors placeholder:text-[#9CA3AF]"
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
                {filtered.length} incidents
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#F3F4F6]">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-[#9CA3AF] text-sm font-light italic">
                  Observation deck empty.
                </div>
              ) : (
                filtered.map((incident) => (
                  <button
                    key={incident.id}
                    onClick={() => navigate(`/app/incidents/${incident.id}`)}
                    className={cn(
                      "w-full p-5 text-left transition-colors flex flex-col gap-2 relative",
                      selected?.id === incident.id
                        ? "bg-gray-50"
                        : "hover:bg-gray-50/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-blue-600 font-bold">
                        #{incident.id}
                      </span>
                      <RiskBadge tier={incident.risk_tier} />
                    </div>
                    <h4 className="text-sm font-semibold truncate text-[#111827]">
                      {incident.pipeline_name}
                    </h4>
                    {incident.root_cause && (
                      <p className="text-[11px] text-[#6B7280] line-clamp-2 leading-snug">
                        {incident.root_cause}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <StatusBadge status={incident.status} />
                      <span className="text-[10px] text-[#9CA3AF] font-mono tabular-nums">
                        {timeAgo(incident.detected_at)}
                      </span>
                    </div>
                    {selected?.id === incident.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#111827]" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {!selected ? (
              <EmptyState />
            ) : (
              <ZigZagIncidentFlow incident={selected} />
            )}
          </div>
        </main>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-[#9CA3AF] grid-backdrop">
      <ShieldAlert className="w-16 h-16 mb-6 opacity-10" />
      <p className="text-xs uppercase font-bold tracking-[0.18em] text-center px-12 leading-relaxed">
        Select an incident to begin investigation
      </p>
      <p className="text-[10px] mt-3 text-[#9CA3AF] uppercase tracking-[0.18em]">
        — or inject a synthetic one to watch the loop run —
      </p>
    </div>
  );
}

function IncidentDetail({
  incident,
  logs,
  onApprove,
  onReject,
}: {
  incident: Incident;
  logs: any[];
  onApprove: () => void;
  onReject: () => void;
}) {
  const { state } = useStore();
  const pipeline = state.pipelines.find((p) => p.id === incident.pipeline_id);
  const [tab, setTab] = useState<
    "overview" | "dag" | "agents" | "tools" | "memory"
  >("overview");
  const [similar, setSimilar] = useState<MemoryEntry[]>([]);

  const currentStageIdx = LOOP_STAGES.findIndex((s) =>
    s.statuses.includes(incident.status as any),
  );

  useEffect(() => {
    let cancelled = false;
    if (incident.root_cause) {
      api
        .searchMemory(
          `${incident.pipeline_name} ${incident.root_cause}`,
          "episodic",
          4,
        )
        .then((r) => !cancelled && setSimilar(r))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [incident.id, incident.root_cause]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Detail header */}
      <div className="px-10 py-7 border-b border-[#E5E7EB] flex items-start justify-between bg-gray-50/30">
        <div className="min-w-0">
          <h2 className="text-2xl font-light italic tracking-tight">
            {incident.pipeline_name}
          </h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] font-mono text-[#9CA3AF]">
              DETECTED · {formatTime(incident.detected_at)}
            </span>
            <div className="h-1 w-1 rounded-full bg-[#E5E7EB]" />
            <span className="text-[10px] font-mono text-[#9CA3AF]">
              ID · {incident.id}
            </span>
            {incident.failed_node && (
              <>
                <div className="h-1 w-1 rounded-full bg-[#E5E7EB]" />
                <span className="text-[10px] font-mono text-[#9CA3AF]">
                  NODE · {incident.failed_node}
                </span>
              </>
            )}
            {incident.confidence_score != null && (
              <>
                <div className="h-1 w-1 rounded-full bg-[#E5E7EB]" />
                <span className="text-[10px] font-mono text-[#9CA3AF]">
                  CONFIDENCE · {(incident.confidence_score * 100).toFixed(0)}%
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {incident.status === "Awaiting Approval" && (
            <>
              <button
                onClick={onReject}
                className="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#111827] rounded text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={onApprove}
                className="px-6 py-2.5 bg-[#111827] text-white rounded text-xs font-semibold hover:bg-black transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Authorize Action
              </button>
            </>
          )}
          <StatusBadge status={incident.status} size="md" />
        </div>
      </div>

      {/* Loop progress strip */}
      <div className="px-10 py-6 border-b border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-1">
          {LOOP_STAGES.map((stage, idx) => {
            const isPast = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const isFuture = idx > currentStageIdx;
            return (
              <div key={stage.id} className="flex items-center gap-1 flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-md border flex items-center justify-center transition-all shrink-0",
                      isPast && "bg-emerald-500 border-emerald-500 text-white",
                      isCurrent && "bg-[#111827] border-[#111827] text-white",
                      isFuture && "bg-white border-[#E5E7EB] text-[#9CA3AF]",
                    )}
                  >
                    {isCurrent && incident.status !== "Failed" ? (
                      <stage.icon className="w-4 h-4 animate-pulse" />
                    ) : (
                      <stage.icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[10px] uppercase tracking-[0.18em] font-bold",
                        isFuture ? "text-[#9CA3AF]" : "text-[#111827]",
                      )}
                    >
                      {stage.label}
                    </p>
                  </div>
                </div>
                {idx < LOOP_STAGES.length - 1 && (
                  <ArrowRight
                    className={cn(
                      "w-3 h-3 shrink-0 mx-1",
                      isPast ? "text-emerald-500" : "text-[#D1D5DB]",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-10 border-b border-[#E5E7EB] flex gap-1 bg-white shrink-0">
        {(
          [
            ["overview", "Overview"],
            ["agents", "Agent Trace"],
            ["dag", "Topology"],
            ["tools", "Tool Calls"],
            ["memory", "Memory"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] border-b-2 transition-all",
              tab === key
                ? "border-[#111827] text-[#111827]"
                : "border-transparent text-[#9CA3AF] hover:text-[#6B7280]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        {tab === "overview" && (
          <Overview incident={incident} similar={similar} />
        )}
        {tab === "agents" && <AgentTrace incident={incident} logs={logs} />}
        {tab === "dag" && pipeline && (
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mb-4">
              Topology · failed node highlighted
            </h3>
            <PipelineDAG
              nodes={pipeline.dag}
              failedNode={incident.failed_node}
              orientation="horizontal"
            />
          </div>
        )}
        {tab === "tools" && <ToolCalls incident={incident} />}
        {tab === "memory" && <MemoryRetrieval similar={similar} />}
      </div>
    </div>
  );
}

function Overview({
  incident,
  similar,
}: {
  incident: Incident;
  similar: MemoryEntry[];
}) {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* Error log */}
      <section>
        <h5 className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#9CA3AF] mb-3 flex items-center gap-2">
          <Terminal className="w-3 h-3" />
          Diagnostic Input Stream
        </h5>
        <div className="bg-[#0F172A] text-emerald-400 p-5 rounded font-mono text-[11px] leading-relaxed shadow-sm overflow-x-auto">
          <span className="text-[#64748B]">[orchestrator] $</span> tail -f
          pipeline.log
          {"\n"}
          <span className="text-amber-400">{incident.error_log}</span>
        </div>
      </section>

      {incident.root_cause && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="p-7 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg relative overflow-hidden grid-backdrop">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Brain className="w-24 h-24 text-[#111827]" />
            </div>
            <h5 className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#111827] mb-3 flex items-center gap-2">
              <Brain className="w-3 h-3" />
              Diagnosis Agent · Cognitive Output
            </h5>
            <p className="text-lg font-medium text-[#111827] mb-3 leading-tight">
              {incident.root_cause}
            </p>
            <div className="hairline h-px w-full my-4" />
            <p className="text-xs italic text-[#6B7280] leading-relaxed max-w-3xl">
              “{incident.agent_thought}”
            </p>
          </div>

          {incident.proposed_action && (
            <div>
              <h5 className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#9CA3AF] mb-4 flex items-center gap-2">
                <ActivityIcon className="w-3 h-3" />
                Remediation Strategy ·{" "}
                <span className="text-[#111827]">
                  {incident.proposed_action}
                </span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(incident.remediation_plan || []).map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-[#E5E7EB] rounded flex items-center gap-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="w-7 h-7 rounded border border-[#E5E7EB] bg-gray-50 flex items-center justify-center text-[10px] font-mono font-bold text-[#111827]">
                      0{idx + 1}
                    </div>
                    <span className="text-xs font-medium text-[#4B5563]">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {similar.length > 0 && (
            <div>
              <h5 className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#9CA3AF] mb-3 flex items-center gap-2">
                <Brain className="w-3 h-3" />
                RAG · Top-{similar.length} Similar Past Incidents
              </h5>
              <div className="space-y-2">
                {similar.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-white border border-[#E5E7EB] rounded flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">
                        {s.summary}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                      sim {(s.similarity || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {incident.resolved_at && (
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h6 className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.18em]">
                  Pipeline Recovered
                </h6>
                <p className="text-xs font-medium text-emerald-700/70 mt-0.5">
                  Verification successful at {formatTime(incident.resolved_at)}
                </p>
              </div>
            </div>
          )}
        </motion.section>
      )}
    </div>
  );
}

function AgentTrace({ incident, logs }: { incident: Incident; logs: any[] }) {
  const filtered = logs.filter((l) => l.incident_id === incident.id);
  return (
    <div className="space-y-8">
      <div>
        <h5 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-4">
          Lifecycle Timeline
        </h5>
        <div className="relative pl-6 border-l border-[#E5E7EB] space-y-4">
          {incident.timeline.map((tl, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[27px] w-3 h-3 rounded-full bg-[#111827] border-2 border-white" />
              <div className="bg-white border border-[#E5E7EB] rounded p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#111827]">
                    {tl.stage}
                  </span>
                  <span className="text-[10px] font-mono text-[#9CA3AF]">
                    {formatTime(tl.ts)} · {tl.agent}
                  </span>
                </div>
                <p className="text-xs text-[#4B5563] mt-2">{tl.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h5 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-3">
          Streamed Agent Logs ({filtered.length})
        </h5>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 max-h-[420px]">
          <LiveLogStream logs={filtered} compact />
        </div>
      </div>
    </div>
  );
}

function ToolCalls({ incident }: { incident: Incident }) {
  if (!incident.tool_calls.length) {
    return (
      <p className="text-[#9CA3AF] italic text-sm">
        No tool calls recorded yet — execution has not started.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <h5 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-1">
        Tool Calls · {incident.tool_calls.length} invocation
        {incident.tool_calls.length === 1 ? "" : "s"}
      </h5>
      {incident.tool_calls.map((tc, i) => (
        <ToolCallRow key={i} tc={tc} idx={i} />
      ))}
    </div>
  );
}

function ToolCallRow({ tc, idx }: { tc: any; idx: number }) {
  const [open, setOpen] = useState(false);
  const ok = tc.status === "success";
  return (
    <div className="bg-white border border-[#E5E7EB] rounded">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#9CA3AF] font-bold">
            #{(idx + 1).toString().padStart(2, "0")}
          </span>
          <Wrench className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="font-mono text-xs font-semibold">{tc.tool}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded",
              ok
                ? "bg-emerald-50 text-emerald-700"
                : tc.status === "failed"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700",
            )}
          >
            {tc.status || "pending"}
          </span>
          {tc.duration_ms != null && (
            <span className="text-[10px] font-mono text-[#9CA3AF] tabular-nums">
              {tc.duration_ms}ms
            </span>
          )}
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-[#F3F4F6] bg-gray-50/50 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-2">
              Args
            </p>
            <pre className="font-mono text-[11px] text-[#4B5563] bg-white border border-[#E5E7EB] rounded p-3 overflow-x-auto">
              {JSON.stringify(tc.args, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-2">
              Result
            </p>
            <pre className="font-mono text-[11px] text-[#4B5563] bg-white border border-[#E5E7EB] rounded p-3 overflow-x-auto">
              {JSON.stringify(tc.result || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MemoryRetrieval({ similar }: { similar: MemoryEntry[] }) {
  if (!similar.length) {
    return (
      <p className="text-[#9CA3AF] italic text-sm">
        Diagnosis hasn't completed yet — RAG matches will appear here once it
        does.
      </p>
    );
  }
  return (
    <div className="space-y-3 max-w-4xl">
      <h5 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-1">
        Retrieved Memory · {similar.length} matches
      </h5>
      {similar.map((s) => (
        <div
          key={s.id}
          className="bg-white border border-[#E5E7EB] rounded p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                {s.summary}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {s.tags.slice(0, 5).map((t) => (
                  <span key={t} className="tag-chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                sim {(s.similarity || 0).toFixed(2)}
              </span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
                {s.kind}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ZigZagIncidentFlow({ incident }: { incident: Incident }) {
  const steps = [
    {
      id: "step-1",
      title: "Incident Detection",
      actor: "System",
      color: "amber",
      tag: "Agentic Intervention",
      progress: 75,
      description: `Issue Summary: High severity issue detected in ${incident.pipeline_name}.\nDetection Time: ${formatTime(incident.detected_at)}\nPipeline ID at connector: ${incident.pipeline_id}\nContext: Severity ${incident.risk_tier}`
    },
    {
      id: "step-2",
      title: "Initial Notification",
      actor: "Mailer",
      color: "red",
      tag: "Higher Agentic Intervention",
      progress: 85,
      description: `1st notification sent by mail to Admin <admin@example.com> with possible solution.`
    },
    {
      id: "step-3",
      title: "Escalation",
      actor: "System",
      color: "dark-red",
      tag: "High Alert Intervention",
      progress: 95,
      description: `Issue summary: High severity issue in ${incident.pipeline_name}.\nDetection time: ${formatTime(incident.detected_at)}\nPipeline ID at connector: ${incident.pipeline_id}\nEarlier mail sent on ${formatTime(incident.detected_at)} to Admin.\nNeed immediate attention with manual intervention and mail sent to Senior Data Engineer (1st 3 levels).`
    },
    {
      id: "step-4",
      title: "Resolution",
      actor: "Engineer",
      color: "green",
      tag: "Human Intervention",
      progress: 100,
      description: `Issue resolved at ${incident.resolved_at ? formatTime(incident.resolved_at) : 'Pending'}`
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-10 bg-gray-50 relative flex flex-col items-center">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#111827 1px, transparent 1px), linear-gradient(90deg, #111827 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="w-full max-w-6xl z-10">
        <div className="flex flex-col gap-y-16">
          {(() => {
            const chunkedSteps = [];
            for (let i = 0; i < steps.length; i += 4) {
              chunkedSteps.push(steps.slice(i, i + 4));
            }
            return chunkedSteps.map((chunk, rowIndex) => {
              const isReversed = rowIndex % 2 !== 0;
              const displaySteps = isReversed ? [...chunk].reverse() : chunk;
              return (
                <div key={rowIndex} className="relative">
                  <div className="grid grid-cols-4 gap-x-12 gap-y-16">
                    {displaySteps.map((step, i) => {
                      const showHorizontalArrow = isReversed
                        ? i > 0
                        : i < displaySteps.length - 1;
                      const showVerticalArrow =
                        (isReversed ? i === 0 : i === displaySteps.length - 1) &&
                        rowIndex < chunkedSteps.length - 1;
                      return (
                        <div
                          key={step.id}
                          className="relative group/step"
                          style={
                            isReversed && i === 0
                              ? { gridColumnStart: 4 - chunk.length + 1 }
                              : {}
                          }
                        >
                          <FlowStepCard step={step} index={rowIndex * 4 + i} />
                          {/* Horizontal Arrow */}
                          {showHorizontalArrow && (
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 z-10 flex items-center",
                                isReversed ? "-left-8" : "-right-8"
                              )}
                            >
                              {isReversed ? (
                                <div className="flex items-center">
                                  <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-[#D1D5DB]" />
                                  <div className="w-6 h-px bg-[#D1D5DB]" />
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <div className="w-6 h-px bg-[#D1D5DB]" />
                                  <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#D1D5DB]" />
                                </div>
                              )}
                            </div>
                          )}
                          {/* Vertical Arrow */}
                          {showVerticalArrow && (
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                              <div className="w-px h-8 bg-[#D1D5DB]" />
                              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#D1D5DB]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

function FlowStepCard({ step, index }: { step: any; index: number }) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'amber':
        return 'border-amber-200 bg-white shadow-amber-100/50';
      case 'red':
        return 'border-red-200 bg-white shadow-red-100/50';
      case 'dark-red':
        return 'border-red-300 bg-red-50/30 shadow-red-200/50';
      case 'green':
        return 'border-emerald-200 bg-white shadow-emerald-100/50';
      default:
        return 'border-gray-200 bg-white shadow-sm';
    }
  };

  const badgeColorClasses = (color: string) => {
    switch (color) {
      case 'amber':
        return 'border-amber-200 text-amber-700 bg-amber-50 border';
      case 'red':
        return 'border-red-200 text-red-700 bg-red-50 border';
      case 'dark-red':
        return 'border-red-300 text-red-800 bg-red-100 border';
      case 'green':
        return 'border-emerald-200 text-emerald-700 bg-emerald-50 border';
      default:
        return 'border-gray-200 text-gray-700 bg-gray-50 border';
    }
  };

  return (
    <div className={cn("p-5 border rounded-xl shadow-lg h-full flex flex-col transition-all hover:-translate-y-1", getColorClasses(step.color))}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
          STEP {index + 1}
        </span>
        <span className={cn("text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1.5", badgeColorClasses(step.color))}>
          <UserCheck className="w-3 h-3" />
          {step.actor}
        </span>
      </div>
      <h4 className="text-sm font-bold text-[#111827] mb-3 leading-snug">{step.title}</h4>
      <div className="space-y-2 flex-1 text-[#4B5563] text-[11px] leading-relaxed whitespace-pre-wrap">
        {step.description}
      </div>
    </div>
  );
}
