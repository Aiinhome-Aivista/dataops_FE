import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { ConnectorModal } from '../components/ConnectorModal';
import { api } from '../services/api';
import type { Connector } from '../types';
import { cn } from '../lib/utils';

const TYPE_BADGE: Record<string, string> = {
  Orchestrator: 'bg-blue-50 text-blue-700 border-blue-100',
  Monitoring: 'bg-purple-50 text-purple-700 border-purple-100',
  Logs: 'bg-amber-50 text-amber-700 border-amber-100',
  Ticketing: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Communication: 'bg-pink-50 text-pink-700 border-pink-100',
  Git: 'bg-gray-50 text-gray-700 border-gray-100',
  Runtime: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  Cloud: 'bg-sky-50 text-sky-700 border-sky-100',
};

export function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [open, setOpen] = useState(false);
  const [openOnNew, setOpenOnNew] = useState(false);

  const reload = async () => setConnectors(await api.connectors());

  useEffect(() => {
    reload();
  }, []);

  const grouped = connectors.reduce<Record<string, Connector[]>>((acc, c) => {
    acc[c.type] = acc[c.type] || [];
    acc[c.type].push(c);
    return acc;
  }, {});

  return (
    <>
      <Header
        title="Connectors"
        subtitle="External systems · orchestrators, telemetry, ticketing"
        actions={
          <button
            onClick={() => { setOpenOnNew(true); setOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#111827] text-white hover:bg-black text-[10px] font-bold uppercase tracking-[0.18em] rounded transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Connector
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Counter label="Total" value={connectors.length} />
            <Counter
              label="Connected"
              value={connectors.filter((c) => c.status === 'connected').length}
              accent="text-emerald-600"
            />
            <Counter
              label="Errored"
              value={connectors.filter((c) => c.status === 'error').length}
              accent="text-red-600"
            />
            <Counter
              label="Categories"
              value={Object.keys(grouped).length}
              accent="text-[#6B7280]"
            />
          </div>

          {Object.entries(grouped).map(([type, list]) => (
            <section key={type}>
              <h3 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF] mb-3">
                {type} · {list.length}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-[#E5E7EB] rounded-lg p-5 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mt-1">
                          {c.last_sync}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            c.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500',
                          )}
                        />
                        <span
                          className={cn(
                            'text-[9px] uppercase tracking-[0.15em] font-bold',
                            c.status === 'connected' ? 'text-emerald-700' : 'text-red-700',
                          )}
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-[9px] uppercase font-bold tracking-[0.15em] px-2 py-0.5 rounded border',
                          TYPE_BADGE[c.type] || 'bg-gray-50 text-gray-700 border-gray-100',
                        )}
                      >
                        {c.type}
                      </span>
                      {c.description && (
                        <span className="text-[10px] text-[#9CA3AF] truncate max-w-[180px]">
                          {c.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <ConnectorModal
        open={open}
        onClose={() => { setOpen(false); setOpenOnNew(false); }}
        connectors={connectors}
        onChange={reload}
        initialView={openOnNew ? 'new' : 'list'}
      />
    </>
  );
}

function Counter({
  label,
  value,
  accent = 'text-[#111827]',
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9CA3AF]">{label}</p>
      <p className={cn('text-2xl font-light italic mt-1 tabular-nums', accent)}>{value}</p>
    </div>
  );
}
