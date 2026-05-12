import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Plus,
  FileText,
  Upload,
  Trash2,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "../../services/api";
import type { Runbook } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Called after a successful upload (or local-only save).
   * Receives the freshly-created Runbook from the backend so the parent
   * page can prepend it to its list immediately.
   */
  onSaved: (runbook: Runbook) => void;
}

export function CreateRunbookModal({ open, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Airflow");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [riskLevel, setRiskLevel] = useState<"Low" | "Medium" | "High">(
    "Medium",
  );
  const [ragEnabled, setRagEnabled] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddStep = () => setSteps([...steps, ""]);
  const handleStepChange = (idx: number, val: string) => {
    const next = [...steps];
    next[idx] = val;
    setSteps(next);
  };
  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setTitle("");
    setCategory("Airflow");
    setDescription("");
    setSteps(["", ""]);
    setRiskLevel("Medium");
    setRagEnabled(true);
    setFile(null);
    setTagsInput("");
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() && !file) {
      setError("Please provide a title or upload a file.");
      return;
    }
    if (!file) {
      // Backend requires a file (otherwise nothing to ingest into Chroma).
      // We synthesize a Markdown file from the user-typed steps so the
      // flow still works even when nothing is uploaded.
      const md =
        `# ${title.trim() || "Untitled runbook"}\n\n` +
        `**Category:** ${category}  \n` +
        `**Risk:** ${riskLevel}\n\n` +
        `## Description\n${description.trim() || "(none)"}\n\n` +
        `## Steps\n` +
        steps
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n");
      const blob = new Blob([md], { type: "text/markdown" });
      const synthetic = new File(
        [blob],
        `${(title.trim() || "runbook").replace(/\s+/g, "_").toLowerCase()}.md`,
        { type: "text/markdown" },
      );
      await doUpload(synthetic);
      return;
    }
    await doUpload(file);
  };

  const doUpload = async (f: File) => {
    setSubmitting(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await api.uploadRunbook({
        file: f,
        title: title.trim() || undefined,
        category,
        description: description.trim(),
        risk_level: riskLevel,
        tags,
        rag_enabled: ragEnabled,
      });

      onSaved(created);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4 overflow-y-auto custom-scrollbar"
          onClick={submitting ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-2xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111827] flex items-center justify-center text-white shadow-md">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Upload Operational Runbook
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    File is stored locally and indexed into the RAG vector store
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={submitting}
                className="text-[#9CA3AF] hover:text-[#111827] transition-colors p-1.5 rounded-lg hover:bg-gray-200/50 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
            >
              {/* Error banner */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title + Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Runbook Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spark OOM triage guide"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white cursor-pointer"
                  >
                    <option value="Azure Data Factory">
                      Azure Data Factory
                    </option>
                    <option value="Databricks">Databricks</option>
                    <option value="GitHub Actions">GitHub Actions</option>
                    <option value="AWS Glue">AWS Glue</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="When does this runbook apply? Which symptoms does it remediate?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white resize-none"
                />
              </div>

              {/* Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                  Source File (PDF / DOCX / MD / TXT)
                </label>
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 text-center bg-[#F9FAFB] hover:bg-gray-50/50 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Upload file"
                    disabled={submitting}
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <Upload className="w-4 h-4 text-gray-400" />
                    </div>
                    {file ? (
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-center">
                          <Check className="w-3.5 h-3.5" /> {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB · click to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          Drag & drop a runbook here, or click to browse
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          PDF, DOCX, Markdown, or TXT · 25 MB max
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">
                  No file? We'll convert your title + steps into a Markdown file
                  and ingest that instead.
                </p>
              </div>

              {/* SOP Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    SOP Steps (optional — used when no file is uploaded)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add step
                  </button>
                </div>
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 select-none pt-1">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        placeholder={`Step ${idx + 1} action…`}
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-gray-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        disabled={steps.length <= 1}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-30 mt-0.5"
                        title="Delete step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="oom, executor, shuffle-skew"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white"
                />
              </div>

              {/* Risk + RAG toggle */}
              <div className="border-t border-[#E5E7EB] pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Risk Level
                  </label>
                  <div className="flex gap-3">
                    {(["Low", "Medium", "High"] as const).map((tier) => (
                      <label
                        key={tier}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          riskLevel === tier
                            ? tier === "Low"
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                              : tier === "Medium"
                                ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                                : "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="riskLevel"
                          value={tier}
                          checked={riskLevel === tier}
                          onChange={() => setRiskLevel(tier)}
                          className="sr-only"
                        />
                        {tier}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-linear-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/60 p-3 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="ragToggle"
                    checked={ragEnabled}
                    onChange={(e) => setRagEnabled(e.target.checked)}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="ragToggle"
                    className="text-xs text-gray-700 leading-tight cursor-pointer select-none"
                  >
                    <span className="font-bold text-[#111827] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-500 fill-sky-500" />{" "}
                      Index for RAG retrieval
                    </span>
                    Mistral will retrieve this runbook during incident diagnosis
                  </label>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#111827] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="px-5 py-2 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                  </>
                ) : (
                  "Upload & Index"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
