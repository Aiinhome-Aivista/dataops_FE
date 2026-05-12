import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, FileText, Upload, Trash2, Check, Sparkles } from 'lucide-react';
import type { Runbook } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (runbook: Omit<Runbook, 'id' | 'last_updated' | 'last_updated_by' | 'status'>) => void;
}

export function CreateRunbookModal({ open, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Airflow');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('Markdown');
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [aiUsageEnabled, setAiUsageEnabled] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleAddStep = () => {
    setSteps([...steps, '']);
  };

  const handleStepChange = (index: number, val: string) => {
    const updated = [...steps];
    updated[index] = val;
    setSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      category,
      description: description.trim() || 'No description provided.',
      source: fileName ? fileName.split('.').pop()?.toUpperCase() || source : source,
      risk_level: riskLevel,
      ai_usage_enabled: aiUsageEnabled,
      rag_enabled: aiUsageEnabled,
      ai_approved: aiUsageEnabled,
      human_verified: true,
      steps: steps.map(s => s.trim()).filter(Boolean).length > 0 
        ? steps.map(s => s.trim()).filter(Boolean) 
        : ['Verify subsystem connectivity and run basic checks.'],
      associated_systems: [`Custom ${category} Subsystem`],
      last_incidents_used: [],
      version_history: ['v1.0.0 (Initial Creation)'],
      tags: [category.toLowerCase(), riskLevel.toLowerCase(), 'custom-sop'],
      ai_confidence_score: aiUsageEnabled ? 90 : undefined,
      linked_incidents_count: 0
    });

    // Reset fields
    setTitle('');
    setCategory('Airflow');
    setDescription('');
    setSource('Markdown');
    setSteps(['', '']);
    setRiskLevel('Medium');
    setAiUsageEnabled(true);
    setFileName(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto custom-scrollbar"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
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
                  <h3 className="text-base font-bold text-[#111827]">Create Operational Runbook</h3>
                  <p className="text-xs text-[#6B7280]">Define remediation workflows for AI agents and human operators</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#9CA3AF] hover:text-[#111827] transition-colors p-1.5 rounded-lg hover:bg-gray-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Runbook Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Airflow Scheduler Restart Sequence"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="Airflow">Airflow</option>
                    <option value="Spark">Spark</option>
                    <option value="Kubernetes">Kubernetes</option>
                    <option value="Database">Database</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Custom">Custom</option>
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
                  placeholder="Summarize the triggers, automated scopes, and conditions under which this SOP applies..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-gray-500 bg-[#F9FAFB] focus:bg-white transition-colors resize-none"
                />
              </div>

              {/* Upload Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                  Source Reference / File Upload
                </label>
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-5 text-center bg-[#F9FAFB] hover:bg-gray-50/50 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.md,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setFileName(f.name);
                        const ext = f.name.split('.').pop()?.toUpperCase() || 'Markdown';
                        setSource(ext);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Upload file"
                  />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                      <Upload className="w-4 h-4 text-gray-400" />
                    </div>
                    {fileName ? (
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-center">
                          <Check className="w-3.5 h-3.5" /> {fileName}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Click or drag to replace</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-gray-700">Drag & drop SOP file here, or click to browse</p>
                        <p className="text-[10px] text-gray-400 mt-1">Allowed formats: PDF, DOCX, Markdown, TXT</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Fallback Source selector */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Or select format type:</span>
                  {['PDF', 'DOCX', 'Markdown', 'TXT'].map((ext) => (
                    <button
                      type="button"
                      key={ext}
                      onClick={() => {
                        setSource(ext);
                        setFileName(null);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border transition-colors ${
                        source === ext && !fileName
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              </div>

              {/* SOP Steps Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    SOP Steps Timeline
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Step
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
                        placeholder={`Step ${idx + 1} action description...`}
                        value={step}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-gray-500 bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        disabled={steps.length <= 1}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-30 mt-0.5"
                        title="Delete Step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Level & AI Toggle */}
              <div className="border-t border-[#E5E7EB] pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#111827] uppercase tracking-wider block">
                    Risk Level
                  </label>
                  <div className="flex gap-3">
                    {(['Low', 'Medium', 'High'] as const).map((tier) => (
                      <label
                        key={tier}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          riskLevel === tier
                            ? tier === 'Low'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                              : tier === 'Medium'
                              ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                              : 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
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

                <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/60 p-3 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="aiUsageToggle"
                    checked={aiUsageEnabled}
                    onChange={(e) => setAiUsageEnabled(e.target.checked)}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 border-gray-300 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="aiUsageToggle" className="text-xs text-gray-700 leading-tight cursor-pointer select-none">
                    <span className="font-bold text-[#111827] block flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-500 fill-sky-500" /> AI Retrieval Ready
                    </span>
                    Allow AI agents to use this runbook during remediation
                  </label>
                </div>
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95"
              >
                Save Runbook
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
