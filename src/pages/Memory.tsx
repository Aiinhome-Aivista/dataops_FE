import { useState } from 'react';
import { Search, Brain, BookOpen, Layers, ArrowRight, Info } from 'lucide-react';
import { Header } from '../components/Header';
import { cn } from '../lib/utils';

const KIND_META = {
  episodic: {
    icon: Brain,
    label: 'Episodic',
    description: 'Resolved-incident records · curated by the Learning agent',
  },
  procedural: {
    icon: Layers,
    label: 'Procedural',
    description: 'Versioned playbooks · pulled by the Diagnosis agent on RAG',
  },
  semantic: {
    icon: BookOpen,
    label: 'Semantic',
    description: 'Runbooks, SOPs, postmortems · grounding for novel patterns',
  },
} as const;

export function MemoryPage() {
  const [kind, setKind] = useState<'episodic' | 'procedural' | 'semantic'>('episodic');

  return (
    <>
      <Header
        title="Memory"
        subtitle="Three-tier · episodic / procedural / semantic"
      />
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Unavailable banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Memory System Unavailable</p>
              <p className="text-xs text-amber-700 mt-1">
                The memory API (episodic, procedural, semantic tiers and RAG search) is not available
                in the current backend. This feature requires the Qdrant vector store integration
                which is planned for a future release.
              </p>
            </div>
          </div>

          {/* Tier selector (visual only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => {
              const M = KIND_META[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    'p-6 rounded-lg border text-left transition-all relative overflow-hidden',
                    active
                      ? 'bg-[#111827] border-[#111827] text-white'
                      : 'bg-white border-[#E5E7EB] hover:border-gray-300',
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-md flex items-center justify-center',
                        active ? 'bg-white/10' : 'bg-gray-50',
                      )}
                    >
                      <M.icon className={cn('w-5 h-5', active ? 'text-white' : 'text-[#111827]')} />
                    </div>
                    <ArrowRight
                      className={cn(
                        'w-3 h-3 mt-2 transition-transform',
                        active ? 'translate-x-1' : 'opacity-30',
                      )}
                    />
                  </div>
                  <h3 className={cn('text-lg font-medium tracking-tight', active && 'text-white')}>
                    {M.label}
                  </h3>
                  <p
                    className={cn(
                      'text-[11px] mt-1 leading-relaxed',
                      active ? 'text-white/70' : 'text-[#6B7280]',
                    )}
                  >
                    {M.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Search bar (disabled) */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-2 flex items-center gap-2 opacity-50 pointer-events-none">
            <Search className="w-4 h-4 text-[#9CA3AF] ml-3" />
            <input
              disabled
              placeholder="Memory search unavailable…"
              className="flex-1 px-2 py-2 text-sm bg-transparent outline-none placeholder:text-[#9CA3AF]"
            />
            <button
              disabled
              className="px-4 py-2 bg-[#111827] text-white text-[10px] font-bold uppercase tracking-[0.18em] rounded opacity-50"
            >
              RAG Search
            </button>
          </div>

          {/* Empty state */}
          <div className="bg-white border border-dashed border-[#E5E7EB] rounded-lg p-16 text-center">
            <Brain className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
            <p className="text-[#9CA3AF] italic text-sm">
              No memory entries available. Connect a vector store backend to enable
              episodic, procedural, and semantic memory tiers.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
