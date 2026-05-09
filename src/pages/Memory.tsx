import { useEffect, useMemo, useState } from 'react';
import { Search, Brain, BookOpen, Layers, ArrowRight } from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';
import { cn, timeAgo } from '../lib/utils';
import type { MemoryEntry } from '../types';

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
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryEntry[]>([]);
  const [searching, setSearching] = useState(false);

  const reload = async (k: typeof kind) => {
    try {
      const data = await api.memory(k);
      setEntries(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    reload(kind);
  }, [kind]);

  const onSearch = async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await api.searchMemory(query.trim(), kind, 8);
      setSearchResults(r);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  const visible = searchResults.length > 0 ? searchResults : entries;
  const Meta = KIND_META[kind];

  return (
    <>
      <Header
        title="Memory"
        subtitle="Three-tier · episodic / procedural / semantic"
      />
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Tier selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => {
              const M = KIND_META[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setKind(k);
                    setSearchResults([]);
                    setQuery('');
                  }}
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

          {/* Search bar */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#9CA3AF] ml-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder={`Search ${Meta.label.toLowerCase()} memory…`}
              className="flex-1 px-2 py-2 text-sm bg-transparent outline-none placeholder:text-[#9CA3AF]"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSearchResults([]);
                }}
                className="text-xs text-[#6B7280] hover:text-[#111827] px-2"
              >
                Clear
              </button>
            )}
            <button
              onClick={onSearch}
              disabled={searching}
              className="px-4 py-2 bg-[#111827] text-white text-[10px] font-bold uppercase tracking-[0.18em] rounded hover:bg-black transition-all disabled:opacity-50"
            >
              {searching ? 'Searching…' : 'RAG Search'}
            </button>
          </div>

          {/* Result list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF]">
                {searchResults.length > 0
                  ? `RAG · ${searchResults.length} top matches`
                  : `${visible.length} entries`}
              </h3>
              {searchResults.length > 0 && (
                <button
                  onClick={() => setSearchResults([])}
                  className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#6B7280] hover:text-[#111827]"
                >
                  Clear results
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {visible.length === 0 ? (
                <p className="col-span-2 text-center py-12 text-[#9CA3AF] italic text-sm">
                  No memory entries.
                </p>
              ) : (
                visible.map((m) => <MemoryCard key={m.id} m={m} />)
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function MemoryCard({ m }: { m: MemoryEntry }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{m.title}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mt-1">
            {m.kind} · {timeAgo(m.created_at)}
            {m.times_referenced > 0 && ` · referenced ${m.times_referenced}x`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {m.similarity != null && (
            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              sim {m.similarity.toFixed(2)}
            </span>
          )}
          {m.success != null && (
            <span
              className={cn(
                'text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded',
                m.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
              )}
            >
              {m.success ? 'success' : 'failed'}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-[#6B7280] leading-relaxed">{m.summary}</p>

      {Object.keys(m.payload).length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#F3F4F6] grid grid-cols-2 gap-3">
          {Object.entries(m.payload)
            .filter(([k]) => k !== 'incident_id')
            .slice(0, 4)
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
                  {k}
                </p>
                <p className="font-mono text-[11px] truncate text-[#4B5563] mt-0.5">
                  {Array.isArray(v) ? v.join(', ') : String(v)}
                </p>
              </div>
            ))}
        </div>
      )}

      {m.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          {m.tags.slice(0, 6).map((t) => (
            <span key={t} className="tag-chip">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
