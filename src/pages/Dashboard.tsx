import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  Plug,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Plus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "../components/Skeleton";
import { Header } from "../components/Header";
import { StatCard } from "../components/StatCard";
import { LiveLogStream } from "../components/LiveLogStream";
import {
  RiskBadge,
  StatusBadge,
  PipelineStatusBadge,
} from "../components/Badges";
import { ConnectorModal } from "../components/ConnectorModal";
import { useStore } from "../hooks/useStore";
import { api } from "../services/api";
import type { Connector, HealthMetric, DashboardStats } from "../types";
import { formatTime } from "../lib/utils";

export function DashboardPage() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [showModal, setShowModal] = useState(false);

  const reload = async () => {
    // Fetch connectors independently so they show even if metrics fail
    api
      .connectors()
      .then(setConnectors)
      .catch((e) => console.error("Connectors fetch failed", e));

    // Fetch stats independently
    api
      .stats()
      .then((res) => {
        console.log("Dashboard Stats Received:", res);
        // Handle potential { data: { ... } } wrapping
        const data = (res as any).data || res;
        setStats(data);
      })
      .catch((e) => console.error("Stats fetch failed", e));

    try {
      const hm = await api.metricsHealth();
      setHealthMetrics(hm);
    } catch {
      /* ignore metrics failures */
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const openIncidents = state.incidents.filter(
    (i) => i.status !== "Remediated" && i.status !== "Escalated",
  );

  return (
    <>
      <Header
        title="System Overview"
        subtitle="Autonomous control plane · Observe → Reason → Plan → Act → Learn"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[10px] font-bold uppercase tracking-[0.18em] rounded transition-all"
          >
            <Plus className="w-3 h-3" />
            Connect Source
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="space-y-10 max-w-7xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <StatCard
              label="Connectors"
              value={stats?.total_connectors ?? connectors.length}
              icon={Plug}
              accent="cyan"
              sub={`${connectors.filter((c) => c.status.toUpperCase() === "CONNECTED").length} connected`}
              busy={!stats && connectors.length === 0}
            />
            <StatCard
              label="Pipelines"
              value={stats?.total_pipelines ?? state.pipelines.length}
              icon={Activity}
              accent="violet"
              sub="tracked"
              busy={!stats && state.pipelines.length === 0}
            />
            <StatCard
              label="Runs / 24h"
              value={stats?.runs_last_24h ?? 0}
              icon={Sparkles}
              accent="lime"
              busy={!stats}
            />
            <StatCard
              label="Success rate"
              value={`${stats?.success_rate_24h ?? 100}%`}
              icon={CheckCircle2}
              accent={stats && stats.success_rate_24h < 80 ? "rose" : "lime"}
              sub="last 24h"
              busy={!stats}
            />
            <StatCard
              label="Failures"
              value={stats?.failed_runs_24h ?? 0}
              icon={AlertTriangle}
              accent="rose"
              sub={`${stats?.pending_analyses ?? 0} pending analysis`}
              busy={!stats}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-[#E5E7EB] p-7 rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                    Resolution Performance
                  </h4>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">
                    MTTR & success rate · last 8h
                  </p>
                </div>
                <span className="text-[10px] text-[#6B7280] font-mono">
                  8h window
                </span>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={healthMetrics}>
                    <defs>
                      <linearGradient
                        id="colorMttr"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F3F4F6"
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dx={-8}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 4,
                        fontSize: 11,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mttr"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorMttr)"
                      strokeWidth={1.5}
                      name="MTTR (min)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] p-7 rounded-lg flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                  Auto vs Human
                </h4>
                <span className="text-[10px] text-[#6B7280] font-mono">
                  8h window
                </span>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthMetrics}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#F3F4F6"
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dx={-4}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="auto_resolved"
                      stroke="#10B981"
                      strokeWidth={1.5}
                      dot={false}
                      name="Auto"
                    />
                    <Line
                      type="monotone"
                      dataKey="human_required"
                      stroke="#F59E0B"
                      strokeWidth={1.5}
                      dot={false}
                      name="Human"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="border border-[#E5E7EB] rounded p-3">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
                    Auto-Resolved
                  </p>
                  <p className="text-lg font-light italic mt-1 text-emerald-600">
                    {healthMetrics.reduce((s, m) => s + m.auto_resolved, 0)}
                  </p>
                </div>
                <div className="border border-[#E5E7EB] rounded p-3">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
                    Required Human
                  </p>
                  <p className="text-lg font-light italic mt-1 text-amber-600">
                    {healthMetrics.reduce((s, m) => s + m.human_required, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pipelines + Live agent feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-lg flex flex-col">
              <div className="px-7 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Pipeline Catalog</h4>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-[0.18em] font-bold mt-1">
                    {state.pipelines.length} active jobs
                  </p>
                </div>
                <button
                  onClick={() => navigate("/app/pipelines")}
                  className="text-xs font-medium text-[#111827] hover:underline underline-offset-4"
                >
                  Catalog →
                </button>
              </div>
              <div className="flex-1 divide-y divide-[#F3F4F6]">
                {state.pipelines.length === 0
                  ? [1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-full p-5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-8 h-8 rounded" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex flex-col items-end gap-1">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-2 w-20" />
                          </div>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      </div>
                    ))
                  : state.pipelines.map((pipeline) => (
                  <button
                    key={pipeline.id}
                    onClick={() => navigate(`/pipelines/${pipeline.id}`)}
                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center ${
                          pipeline.status === "healthy"
                            ? "bg-emerald-50 text-emerald-600"
                            : pipeline.status === "degraded"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-medium">{pipeline.name}</h5>
                        <p className="text-[10px] text-[#9CA3AF]">
                          {pipeline.owner} · last run {pipeline.last_run}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex flex-col items-end">
                        <p className="text-xs font-semibold font-mono tabular-nums">
                          {pipeline.throughput.toLocaleString()}{" "}
                          <span className="text-[#9CA3AF] font-normal">
                            msg/s
                          </span>
                        </p>
                        <p className="text-[10px] text-[#9CA3AF] font-mono">
                          p95 {pipeline.latency}ms
                        </p>
                      </div>
                      <PipelineStatusBadge status={pipeline.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-lg flex flex-col overflow-hidden">
              <div className="px-7 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-500" />
                  <h4 className="text-sm font-semibold">Agent Activity</h4>
                </div>
                <span className="text-[10px] text-[#6B7280] font-mono">
                  live
                </span>
              </div>
              <div className="flex-1 p-3 max-h-[480px]">
                <LiveLogStream logs={state.logs.slice(0, 40)} compact />
              </div>
            </div>
          </div>

          {/* Active incidents table */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden flex flex-col">
            <div className="px-7 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">
                  Incident Monitoring Loop
                </h4>
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-[0.18em] font-bold mt-1">
                  {openIncidents.length} open · {state.incidents.length} total
                </p>
              </div>
              <button
                onClick={() => navigate("/app/incidents")}
                className="text-xs font-medium text-[#111827] hover:underline underline-offset-4"
              >
                Advanced Analysis →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] border-b border-[#F3F4F6]">
                    <th className="px-7 py-4 font-bold">Reference</th>
                    <th className="px-7 py-4 font-bold">Pipeline</th>
                    <th className="px-7 py-4 font-bold">Loop State</th>
                    <th className="px-7 py-4 font-bold">Risk</th>
                    <th className="px-7 py-4 font-bold text-right">Detected</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#F3F4F6]">
                  {openIncidents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-7 py-12 text-center text-[#9CA3AF] italic"
                      >
                        All systems operating within acceptable parameters.
                      </td>
                    </tr>
                  ) : (
                    openIncidents.slice(0, 8).map((incident) => (
                      <tr
                        key={incident.id}
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-7 py-5">
                          <span className="font-mono text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">
                            #{incident.id}
                          </span>
                        </td>
                        <td className="px-7 py-5 font-medium">
                          {incident.pipeline_name}
                        </td>
                        <td className="px-7 py-5">
                          <StatusBadge status={incident.status} />
                        </td>
                        <td className="px-7 py-5">
                          <RiskBadge tier={incident.risk_tier} />
                        </td>
                        <td className="px-7 py-5 text-right font-mono text-xs text-[#6B7280] tabular-nums">
                          {formatTime(incident.detected_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <ConnectorModal
        open={showModal}
        onClose={() => setShowModal(false)}
        connectors={connectors}
        onChange={reload}
      />
    </>
  );
}
