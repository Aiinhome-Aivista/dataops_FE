import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, Calendar, Database, Tag, User, X, RotateCw, Workflow, PlayCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { PipelineDAG } from '../components/PipelineDAG';
import { PipelineStatusBadge } from '../components/Badges';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import type { Pipeline } from '../types';

export function PipelinesPage() {
  const { state, refresh } = useStore();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'SUCCEEDED' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState('');
  const [localPipelines, setLocalPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);

  const connectorId = searchParams.get('connector_id');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.pipelines(connectorId ? { connector_id: connectorId } : {});
        setLocalPipelines(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [connectorId]);

  const filtered = useMemo(() => {
    let list = localPipelines.length > 0 || connectorId ? localPipelines : state.pipelines;
    if (search) {
      list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filter === 'ALL') return list;
    if (filter === 'SUCCEEDED') return list.filter((p) => p.status === 'healthy');
    if (filter === 'FAILED') return list.filter((p) => p.status !== 'healthy');
    return list;
  }, [state.pipelines, localPipelines, filter, connectorId, search]);

  const selected = id ? (localPipelines.find(p => p.id === id) || state.pipelines.find((p) => p.id === id)) : null;

  if (selected) {
    return <PipelineDetail pipeline={selected} onBack={() => navigate('/app/pipelines')} />;
  }

  return (
    <>
      <Header
        title="Pipelines"
        subtitle="Synced from connected accounts"
        actions={
          <button 
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[10px] font-bold uppercase tracking-[0.18em] rounded transition-all shadow-sm"
          >
            <RotateCw className="w-3 h-3 text-[#6B7280]" />
            Refresh
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters & Search */}
          <div className="flex items-center gap-4 bg-white border border-[#E5E7EB] p-3 rounded-lg shadow-sm">
            <div className="relative flex-1">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#F9FAFB] border-none rounded-md focus:ring-1 focus:ring-gray-300 outline-none"
              />
            </div>
            <div className="flex items-center gap-1">
              {['ALL', 'SUCCEEDED', 'FAILED', 'RUNNING', 'QUEUED', 'CANCELLED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    'px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all',
                    filter === f
                      ? 'bg-[#111827] text-white'
                      : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {connectorId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-blue-700 w-fit">
              <Tag className="w-3.5 h-3.5" />
              Filtered by Connector ID: {connectorId}
              <button
                onClick={() => setSearchParams({})}
                className="ml-2 hover:text-blue-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Table View */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Pipeline</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Source</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Last Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Last Run</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-[#111827]">{p.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Workflow className="w-3.5 h-3.5 text-sky-600" />
                        <span className="text-[11px] font-bold text-[#4B5563]">ID: {p.connector_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 px-2 py-1 rounded border border-[#E5E7EB] bg-white">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          p.status === 'healthy' ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#4B5563]">
                          {p.status === 'healthy' ? 'SUCCEEDED' : 'FAILED'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-medium text-[#9CA3AF]">
                      {p.last_run || 'never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/app/pipelines/${p.id}`)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] hover:text-[#111827] inline-flex items-center gap-1 transition-all"
                      >
                        view <PlayCircle className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}



function PipelineDetail({ pipeline, onBack }: { pipeline: Pipeline; onBack: () => void }) {
  const { state } = useStore();
  const incidents = state.incidents.filter((i) => i.pipeline_id === pipeline.id);

  return (
    <>
      <Header
        title={pipeline.name}
        subtitle={`${pipeline.owner} · ${pipeline.schedule}`}
        actions={
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[10px] font-bold uppercase tracking-[0.18em] rounded transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
            Catalog
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Meta strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetaTile icon={<Database className="w-3.5 h-3.5" />} label="Status">
              <PipelineStatusBadge status={pipeline.status} />
            </MetaTile>
            <MetaTile icon={<User className="w-3.5 h-3.5" />} label="Owner">
              <span className="text-sm font-medium">{pipeline.owner}</span>
            </MetaTile>
            <MetaTile icon={<Calendar className="w-3.5 h-3.5" />} label="Schedule">
              <span className="font-mono text-[12px]">{pipeline.schedule}</span>
            </MetaTile>
            <MetaTile icon={<Tag className="w-3.5 h-3.5" />} label="SLA">
              <span className="text-sm font-medium">{pipeline.sla_minutes} min</span>
            </MetaTile>
            <MetaTile icon={<Database className="w-3.5 h-3.5" />} label="Throughput">
              <span className="text-sm font-medium tabular-nums">
                {pipeline.throughput.toLocaleString()} msg/s
              </span>
            </MetaTile>
          </div>

          {/* DAG */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mb-4">
              Topology · directed acyclic graph
            </h3>
            <PipelineDAG nodes={pipeline.dag} orientation="horizontal" />
          </section>

          {/* Telemetry */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TelemetryCard
              title="CPU Utilization"
              unit="%"
              dataKey="cpu"
              color="#111827"
              data={pipeline.resource_metrics}
            />
            <TelemetryCard
              title="Memory Usage"
              unit="%"
              dataKey="memory"
              color="#3b82f6"
              data={pipeline.resource_metrics}
            />
            <TelemetryCard
              title="I/O Throughput"
              unit="MB/s"
              dataKey="io"
              color="#10B981"
              data={pipeline.resource_metrics}
            />
          </section>

          {/* Recent incidents on this pipeline */}
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold mb-4">
              Recent Incidents · {incidents.length}
            </h3>
            <div className="bg-white border border-[#E5E7EB] rounded-lg divide-y divide-[#F3F4F6]">
              {incidents.length === 0 ? (
                <p className="px-7 py-10 text-center text-[#9CA3AF] italic text-sm">
                  No incidents on record for this pipeline.
                </p>
              ) : (
                incidents.slice(0, 6).map((inc) => (
                  <div key={inc.id} className="px-7 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-blue-600 font-semibold">
                        #{inc.id}
                      </p>
                      <p className="text-sm font-medium mt-0.5">
                        {inc.root_cause || 'Diagnosing…'}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#6B7280]">
                      {inc.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function MetaTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4">
      <div className="flex items-center gap-2 text-[#9CA3AF] mb-2">
        {icon}
        <span className="text-[9px] uppercase tracking-[0.18em] font-bold">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function TelemetryCard({
  title,
  unit,
  dataKey,
  color,
  data,
}: {
  title: string;
  unit: string;
  dataKey: string;
  color: string;
  data: any[];
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
          {title}
        </h5>
        <span className="text-[10px] text-[#6B7280] font-mono">{unit}</span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`tg-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="time"
              fontSize={9}
              axisLine={false}
              tickLine={false}
              stroke="#9CA3AF"
            />
            <YAxis
              fontSize={9}
              axisLine={false}
              tickLine={false}
              stroke="#9CA3AF"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 4,
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fillOpacity={1}
              fill={`url(#tg-${dataKey})`}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
