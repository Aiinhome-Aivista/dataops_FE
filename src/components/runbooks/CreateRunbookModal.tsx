import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, FileText, Upload, Check, Loader2, AlertCircle } from "lucide-react";
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
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    setSubmitting(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!file) {
      setError("Please upload a file.");
      return;
    }
    await doUpload(file);
  };

  const doUpload = async (f: File) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.uploadRunbook({
        file: f,
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
          className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4 custom-scrollbar"
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

              {/* Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                  Source File (PDF / DOCX / TXT)
                </label>
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 text-center bg-[#F9FAFB] hover:bg-gray-50/50 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
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
                          PDF, DOCX, TXT · 25 MB max
                        </p>
                      </div>
                    )}
                  </div>
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
                  "Upload"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
