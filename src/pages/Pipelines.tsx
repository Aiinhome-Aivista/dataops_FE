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
import { ArrowLeft, Calendar, Database, Tag, User, X } from 'lucide-react';
import { Header } from '../components/Header';
import { PipelineDAG } from '../components/PipelineDAG';
import { PipelineStatusBadge } from '../components/Badges';
import { useStore } from '../hooks/useStore';
import { cn } from '../lib/utils';
import type { Pipeline } from '../types';

export function PipelinesPage() {
  const { state } = useStore();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'tier-1' | 'tier-2' | 'unhealthy'>('all');

  const connectorId = searchParams.get('connector_id');

  const filtered = useMemo(() => {
    let list = state.pipelines;
    if (connectorId) {
      list = list.filter((p) => String(p.connector_id) === connectorId);
    }
    if (filter === 'all') return list;
    if (filter === 'unhealthy') return list.filter((p) => p.status !== 'healthy');
    return list.filter((p) => p.tags.includes(filter));
  }, [state.pipelines, filter, connectorId]);

  const selected = id ? state.pipelines.find((p) => p.id === id) : null;

  if (selected) {
    return <PipelineDetail pipeline={selected} onBack={() => navigate('/app/pipelines')} />;
  }

  return (
    <>
      <Header
        title="Pipeline Catalog"
        subtitle="Topology · schedules · live telemetry"
      />
      <main className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'tier-1', label: 'Tier 1' },
              { id: 'tier-2', label: 'Tier 2' },
              { id: 'unhealthy', label: 'Unhealthy' },
            ].map((f) => (
            <button
              onClick={() => setFilter(f.id as any)}
              className={cn(
                'px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] rounded border transition-all',
                filter === f.id
                  ? 'bg-[#111827] text-white border-[#111827]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-gray-300',
              )}
            >
              {f.label}
            </button>
          ))}
          {connectorId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
              Filtered by Connector
              <button
                onClick={() => setSearchParams({})}
                className="ml-1 text-blue-400 hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
            {filtered.length} matches
          </span>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((p) => (
              <PipelineCard key={p.id} pipeline={p} onClick={() => navigate(`/pipelines/${p.id}`)} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function PipelineCard({ pipeline, onClick }: { pipeline: Pipeline; onClick: () => void }) {
  const last = pipeline.resource_metrics.slice(-12);
  return (
    <button
      onClick={onClick}
      className="bg-white border border-[#E5E7EB] rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{pipeline.name}</h3>
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-[0.18em] font-bold mt-1">
            {pipeline.owner}
          </p>
        </div>
        <PipelineStatusBadge status={pipeline.status} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Metric label="Throughput" value={pipeline.throughput.toLocaleString()} unit="msg/s" />
        <Metric label="Latency" value={String(pipeline.latency)} unit="ms" />
        <Metric label="SLA" value={String(pipeline.sla_minutes)} unit="min" />
      </div>

      <div className="h-[60px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last}>
            <defs>
              <linearGradient id={`mg-${pipeline.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#3b82f6"
              strokeWidth={1.2}
              fill={`url(#mg-${pipeline.id})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {pipeline.tags.map((t) => (
          <span key={t} className="tag-chip">
            {t}
          </span>
        ))}
        <span className="ml-auto text-[10px] font-mono text-[#9CA3AF]">
          {pipeline.schedule}
        </span>
      </div>
    </button>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">{label}</p>
      <p className="text-base font-light italic mt-1 tabular-nums">
        {value} <span className="text-[10px] text-[#9CA3AF] not-italic font-mono">{unit}</span>
      </p>
    </div>
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
