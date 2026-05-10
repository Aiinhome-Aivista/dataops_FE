import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  RotateCw,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Header } from "../Header";
import { api } from "../../services/api";
import { cn } from "../../lib/utils";
import type { Pipeline } from "../../types";

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
  const [run, setRun] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [logFilter, setLogFilter] = useState("ALL");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [runData, logsData, analysisData] = await Promise.all([
        api.run(runId),
        api.runLogs(runId),
        api.runAnalysis(runId),
      ]);
      setRun(runData);
      setLogs(logsData);
      setAnalysis(analysisData);
    } catch (e) {
      console.error("Failed to load run forensic data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [runId]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const triggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await api.triggerRunAnalysis(runId);
      setAnalysis(result);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === "ALL") return true;
    return l.level === logFilter;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-4">
          <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-mono text-[#6B7280]">
            extracting run forensics...
          </p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-[#E5E7EB] mx-auto mb-4" />
          <h3 className="text-sm font-bold text-[#111827] mb-2">
            Run data not found
          </h3>
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
        subtitle={`// PIPELINE: ${pipeline.name} · EXTERNAL_ID=${run.external_run_id}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:text-[#111827] flex items-center gap-2 transition-all"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              onClick={onBack}
              className="bg-white border border-[#E5E7EB] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:bg-gray-50 flex items-center gap-2 transition-all"
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Status Strip */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                  run.status === "FAILED"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100",
                )}
              >
                {run.status}
              </span>
              <span className="font-mono text-xs text-[#6B7280]">
                {run.started_at &&
                  format(new Date(run.started_at), "yyyy-MM-dd HH:mm:ss")}
                {run.duration_seconds != null &&
                  ` · ${run.duration_seconds.toFixed(1)}s`}
              </span>
            </div>
            {(run.status === "FAILED" || analysis) && (
              <button
                onClick={triggerAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded hover:bg-black transition-all shadow-sm disabled:opacity-50"
              >
                <Brain size={14} className={analyzing ? "animate-pulse" : ""} />
                {analysis ? "Re-analyze" : "Analyze Failure"}
              </button>
            )}
          </div>

          {/* Error Message */}
          {run.error_message && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={16}
                  className="text-rose-600 mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">
                    Error Message
                  </div>
                  <div className="text-sm font-mono text-[#111827] wrap-break-word">
                    {run.error_message}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM Analysis Panel */}
          {analysis ? (
            <AnalysisPanel analysis={analysis} />
          ) : (
            run.status === "FAILED" && (
              <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-50/50 blur-3xl rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-md bg-blue-50 border border-blue-100">
                    <Sparkles size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#111827]">
                      No analysis available
                    </div>
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                      AI diagnosis has not been triggered for this failure
                    </div>
                  </div>
                </div>
                <button
                  onClick={triggerAnalysis}
                  disabled={analyzing}
                  className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-blue-700 transition-all shadow-sm"
                >
                  Run AI Diagnosis
                </button>
              </div>
            )
          )}

          {/* Logs Viewer */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Logs{" "}
                  <span className="text-xs font-mono text-[#9CA3AF]">
                    ({filteredLogs.length})
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {["ALL", "ERROR", "WARNING", "INFO"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all",
                      logFilter === lvl
                        ? "border-blue-600 text-blue-600 bg-blue-50"
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]",
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-[#111827] p-5 font-mono text-[11px] max-h-[600px] overflow-auto custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="text-[#4B5563] italic text-sm py-4 text-center">
                  No logs available for this run.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((l, i) => (
                    <div
                      key={i}
                      className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group"
                    >
                      <span className="text-[#4B5563] shrink-0 select-none">
                        {format(new Date(l.timestamp), "HH:mm:ss")}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 w-16 font-bold",
                          l.level === "ERROR"
                            ? "text-rose-500"
                            : l.level === "WARNING"
                              ? "text-amber-500"
                              : "text-emerald-500",
                        )}
                      >
                        [{l.level}]
                      </span>
                      {l.source && (
                        <span className="text-blue-400 shrink-0 max-w-[150px] truncate">
                          {l.source}
                        </span>
                      )}
                      <span
                        className={cn(
                          "flex-1 whitespace-pre-wrap wrap-break-word",
                          l.level === "ERROR"
                            ? "text-rose-200"
                            : "text-gray-300",
                        )}
                      >
                        {l.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: any }) {
  const [showPatch, setShowPatch] = useState(false);
  const confidence = analysis.confidence ?? 0;

  return (
    <div className="bg-white border border-blue-100 rounded-xl shadow-sm relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-50/30 blur-3xl rounded-full pointer-events-none" />

      <div className="px-5 py-4 border-b border-blue-50 bg-blue-50/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-white border border-blue-100 shadow-sm">
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              Mistral Diagnosis
              {analysis.model && (
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                  {analysis.model}
                </span>
              )}
            </div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-0.5">
              Generated{" "}
              {formatDistanceToNow(new Date(analysis.created_at), {
                addSuffix: true,
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
            Confidence
          </span>
          <div className="w-24 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500",
                confidence >= 0.7
                  ? "bg-emerald-500"
                  : confidence >= 0.4
                    ? "bg-amber-500"
                    : "bg-rose-500",
              )}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold font-mono",
              confidence >= 0.7
                ? "text-emerald-600"
                : confidence >= 0.4
                  ? "text-amber-600"
                  : "text-rose-600",
            )}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
            Summary
          </div>
          <div className="text-sm text-[#111827] leading-relaxed font-medium">
            {analysis.summary}
          </div>
        </div>

        {analysis.root_cause && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Root Cause
            </div>
            <div className="text-sm text-[#4B5563] whitespace-pre-wrap bg-[#F9FAFB] p-4 rounded-lg border border-[#F3F4F6] leading-relaxed">
              {analysis.root_cause}
            </div>
          </div>
        )}

        {analysis.suggested_fix && (
          <div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">
              Suggested Fix
            </div>
            <div className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed italic border-l-4 border-emerald-500 pl-4 py-2">
              {analysis.suggested_fix}
            </div>
          </div>
        )}

        {analysis.fix_patch && (
          <div>
            <button
              onClick={() => setShowPatch((v) => !v)}
              className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-all mb-2"
            >
              {showPatch ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              Proposed Code Patch
            </button>
            {showPatch && (
              <pre className="bg-[#111827] border border-[#374151] rounded-lg p-4 text-[11px] font-mono text-gray-300 overflow-auto max-h-80 whitespace-pre custom-scrollbar shadow-inner">
                {analysis.fix_patch}
              </pre>
            )}
          </div>
        )}

        {analysis.fix_patch && (
          <div className="pt-6 border-t border-[#F3F4F6] flex items-center justify-between flex-wrap gap-4">
            <div className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">
              {analysis.auto_fix_applied ? (
                <span className="text-emerald-600">
                  ✓ Fix submitted: {analysis.auto_fix_result}
                </span>
              ) : (
                "Actionable resolution available for this failure"
              )}
            </div>
            {!analysis.auto_fix_applied && (
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-700 transition-all shadow-sm">
                <Wrench size={14} />
                Apply Fix to Source
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
