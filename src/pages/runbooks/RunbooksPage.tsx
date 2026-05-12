import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Edit3, 
  Archive, 
  PlayCircle,
  ExternalLink,
  Layers,
  ChevronRight
} from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { CreateRunbookModal } from '../../components/runbooks/CreateRunbookModal';
import { RunbookDetailPanel } from '../../components/runbooks/RunbookDetailPanel';
import { INITIAL_RUNBOOKS } from '../../components/runbooks/mockData';
import type { Runbook } from '../../types';
import { timeAgo, cn } from '../../lib/utils';

export function RunbooksPage() {
  const [runbooks, setRunbooks] = useState<Runbook[]>(INITIAL_RUNBOOKS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'AI GENERATED'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRunbookId, setSelectedRunbookId] = useState<string | null>(null);

  // Compute stats
  const stats = useMemo(() => {
    const total = runbooks.filter(r => r.status !== 'ARCHIVED').length;
    const active = runbooks.filter(r => r.status === 'ACTIVE').length;
    const draft = runbooks.filter(r => r.status === 'DRAFT').length;
    const aiGenerated = runbooks.filter(r => r.status === 'AI GENERATED' || r.last_updated_by.includes('AI')).length;
    return { total, active, draft, aiGenerated };
  }, [runbooks]);

  // Filtered and searched list
  const filteredRunbooks = useMemo(() => {
    return runbooks.filter(r => {
      // Search matching
      const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // Filter tabs matching
      if (filter === 'ALL') return r.status !== 'ARCHIVED';
      return r.status.toUpperCase() === filter;
    });
  }, [runbooks, search, filter]);

  // Selected item object
  const selectedRunbook = useMemo(() => {
    return runbooks.find(r => r.id === selectedRunbookId) || null;
  }, [runbooks, selectedRunbookId]);

  // Handlers
  const handleSaveRunbook = (newRunbookData: Omit<Runbook, 'id' | 'last_updated' | 'last_updated_by' | 'status'>) => {
    const created: Runbook = {
      ...newRunbookData,
      id: `rb-${Date.now().toString().slice(-4)}`,
      status: 'ACTIVE',
      last_updated: new Date().toISOString(),
      last_updated_by: 'Current User (Operator)'
    };
    setRunbooks([created, ...runbooks]);
  };

  const handleArchive = (id: string) => {
    setRunbooks(runbooks.map(r => r.id === id ? { ...r, status: 'ARCHIVED' } : r));
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setRunbooks(runbooks.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Header Strip inside Main Area */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/60">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-700" strokeWidth={2.25} />
                <h1 className="text-xl font-bold tracking-tight text-[#111827]">Runbooks</h1>
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                Manage operational runbooks, SOPs, and AI remediation guides
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-md active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
              CREATE RUNBOOK
            </button>
          </div>

          {/* STATS CARDS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Total Runbooks"
              value={stats.total}
              icon={BookOpen}
              accent="violet"
              sub="tracked operational procedures"
            />
            <StatCard
              label="Active"
              value={stats.active}
              icon={CheckCircle2}
              accent="emerald"
              sub="ready for execution"
            />
            <StatCard
              label="Draft"
              value={stats.draft}
              icon={Edit3}
              accent="amber"
              sub="pending verification"
            />
            <StatCard
              label="AI Generated"
              value={stats.aiGenerated}
              icon={Sparkles}
              accent="cyan"
              sub="autonomous reasoning context"
            />
          </div>

          {/* MAIN CONTENT SECTION */}
          <div className="space-y-6">
            {/* Top toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E5E7EB] p-3 rounded-xl shadow-sm">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search runbooks, SOPs, or tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9FAFB] border border-transparent rounded-lg focus:border-gray-300 focus:bg-white outline-none transition-colors"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-[#F9FAFB] p-1 rounded-lg border border-gray-100">
                {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED', 'AI GENERATED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap",
                      filter === tab
                        ? "bg-[#111827] text-white shadow-sm"
                        : "text-[#6B7280] hover:bg-gray-200/50 hover:text-[#111827]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredRunbooks.length === 0 ? (
              /* EMPTY STATE UI */
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-16 text-center shadow-sm flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 shadow-inner">
                  <FileText className="w-6 h-6 text-gray-400 stroke-1" />
                </div>
                <h3 className="text-base font-bold text-[#111827]">No Runbooks Found</h3>
                <p className="text-xs text-[#6B7280] max-w-sm mt-1.5 leading-relaxed">
                  Create operational runbooks and AI remediation guides for autonomous incident resolution.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" /> CREATE FIRST RUNBOOK
                </button>
                
                {/* Small helper labels below */}
                <div className="mt-8 flex items-center gap-6 border-t border-gray-100 pt-6 text-[#9CA3AF]">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-sky-500 fill-sky-500" /> AI Retrieval Ready
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Version Controlled
                  </span>
                </div>
              </div>
            ) : (
              /* Table View */
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Runbook Name
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Category
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Source
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Last Updated
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {filteredRunbooks.map((rb) => (
                      <tr
                        key={rb.id}
                        onClick={() => setSelectedRunbookId(rb.id)}
                        className="hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                      >
                        {/* Runbook Name */}
                        <td className="px-6 py-4 min-w-[220px]">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                                {rb.title}
                              </span>
                              {rb.rag_enabled && (
                                <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-bold uppercase px-1.5 py-0.2 rounded" title="AI Agents can retrieve this SOP">
                                  RAG
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 line-clamp-1 max-w-md">
                              {rb.description}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                            {rb.category}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded">
                            {rb.source}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block border",
                            rb.status === 'ACTIVE' 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : rb.status === 'DRAFT'
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : rb.status === 'AI GENERATED'
                              ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          )}>
                            {rb.status}
                          </span>
                        </td>

                        {/* Last Updated */}
                        <td className="px-6 py-4 whitespace-nowrap text-[11px] font-medium text-[#9CA3AF]">
                          {timeAgo(rb.last_updated)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedRunbookId(rb.id)}
                              className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] hover:text-[#111827] inline-flex items-center gap-1 transition-all"
                            >
                              view <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CREATE RUNBOOK MODAL */}
      <CreateRunbookModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveRunbook}
      />

      {/* RUNBOOK DETAIL PANEL */}
      <RunbookDetailPanel
        runbook={selectedRunbook}
        onClose={() => setSelectedRunbookId(null)}
        onArchive={handleArchive}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
