import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Clock,
  RotateCw,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Header } from "../Header";
import { api } from "../../services/api";
import { cn } from "../../lib/utils";
import type { Pipeline, Incident } from "../../types";

interface RunInvestigationProps {
  runId: string;
  pipeline: Pipeline;
  onBack: () => void;
}

export function RunInvestigation({
  runId,
  pipeline,
  onBack,
}: RunInvestigationProps) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.run(runId);
        setIncident(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [runId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-4">
          <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-mono text-gray-500">
            analyzing run forensics...
          </p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#E5E7EB] mx-auto mb-4" />
          <h3 className="text-sm font-bold text-[#111827] mb-2">
            No Forensic Data Found
          </h3>
          <p className="text-xs text-[#9CA3AF] mb-6 max-w-xs mx-auto">
            This run may not have triggered an incident or forensic analysis is
            still in progress.
          </p>
          <button onClick={onBack} className="btn-secondary">
            Back to Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <Header
        title={`Run Forensic · ${String(runId).slice(0, 8)}`}
        subtitle={`// PIPELINE: ${pipeline.name} · RUN_ID=${runId}`}
        actions={
          <button
            onClick={onBack}
            className="bg-white border border-[#E5E7EB] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:bg-gray-50 flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={12} /> Back
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* AI Diagnosis */}
          <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles size={120} className="text-blue-600" />
            </div>
            <div className="px-6 py-5 border-b border-blue-50 bg-blue-50/30 flex items-center gap-3">
              <div className="p-2 rounded bg-white shadow-sm border border-blue-100">
                <Brain size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">
                  Agent Diagnosis
                </h3>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  Powered by CodeSentry AI
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
                  Root Cause
                </h4>
                <p className="text-sm text-[#374151] leading-relaxed italic border-l-2 border-blue-500 pl-4 bg-blue-50/20 py-3 rounded-r">
                  {incident.root_cause || "Analyzing failure patterns..."}
                </p>
              </div>
              {incident.agent_thought && (
                <div>
                  <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
                    Agent Thought Process
                  </h4>
                  <p className="text-xs text-[#4B5563] leading-relaxed bg-[#F9FAFB] p-4 rounded-lg font-medium">
                    {incident.agent_thought}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool Calls Audit */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-[#4B5563]" />
                  <h3 className="text-sm font-bold text-[#111827]">
                    Tool Audit Trail
                  </h3>
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F9FAFB] text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#F3F4F6]">
                      <th className="px-6 py-3">Tool</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {incident.tool_calls?.map((call, i) => (
                      <tr
                        key={i}
                        className="hover:bg-[#F9FAFB] transition-colors"
                      >
                        <td className="px-6 py-3">
                          <span className="text-xs font-mono font-bold text-[#111827]">
                            {call.tool}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                              call.status === "success"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-rose-50 text-rose-600",
                            )}
                          >
                            {call.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-[10px] font-mono text-[#9CA3AF]">
                            {call.duration_ms}ms
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Investigation Timeline */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#4B5563]" />
                  <h3 className="text-sm font-bold text-[#111827]">
                    Investigation Timeline
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-1 before:-translate-x-px before:h-full before:w-0.5 before:bg-[#F3F4F6]">
                  {incident.timeline?.map((item, i) => (
                    <div
                      key={i}
                      className="relative flex items-center justify-between gap-6 pl-6"
                    >
                      <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-white" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                            {item.agent}
                          </span>
                          <span className="text-[9px] font-mono text-[#9CA3AF]">
                            {new Date(item.ts).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#374151] mb-1">
                          {item.stage}
                        </p>
                        <p className="text-xs text-[#6B7280] leading-relaxed">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
