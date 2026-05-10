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
import { 
  ArrowLeft, Calendar, Database, Tag, User, X, RotateCw, Workflow, 
  PlayCircle, Filter, Activity, Clock, Sparkles, RefreshCw, AlertCircle
} from 'lucide-react';
import { Header } from '../components/Header';
import { PipelineDAG } from '../components/PipelineDAG';
import { PipelineStatusBadge } from '../components/Badges';
import { ConnectorIcon } from '../components/ConnectorIcon';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { cn, timeAgo, formatTime } from '../lib/utils';
import type { Pipeline, Connector, PipelineRun } from '../types';

export function PipelinesPage() {
  const { state, refresh } = useStore();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'SUCCEEDED' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED'>('ALL');
  const [search, setSearch] = useState('');
  const [localPipelines, setLocalPipelines] = useState<Pipeline[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const connectorId = searchParams.get('connector_id');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pData, cData] = await Promise.all([
          api.pipelines(connectorId ? { connector_id: connectorId } : {}),
          api.connectors()
        ]);
        setLocalPipelines(pData);
        setConnectors(cData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [connectorId]);

  // Handle individual pipeline detail fetch
  useEffect(() => {
    if (!id) {
      setSelectedPipeline(null);
      return;
    }

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const data = await api.pipeline(id);
        setSelectedPipeline(data);
      } catch (err) {
        console.error("Failed to fetch pipeline detail:", err);
        // Fallback to local search if API fails
        const found = localPipelines.find(p => String(p.id) === String(id)) || 
                      state.pipelines.find(p => String(p.id) === String(id));
        if (found) setSelectedPipeline(found);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [id, localPipelines, state.pipelines]);

  const connectorMap = useMemo(() => 
    Object.fromEntries(connectors.map(c => [c.id, c])), 
  [connectors]);

  const filtered = useMemo(() => {
    let list = localPipelines.length > 0 || connectorId ? localPipelines : state.pipelines;
    if (search) {
      list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filter !== 'ALL') {
      list = list.filter(p => {
        const s = (p.last_run_status || p.status || "").toUpperCase();
        return s === filter;
      });
    }
    return list;
  }, [state.pipelines, localPipelines, filter, connectorId, search]);

  const selected = id ? (localPipelines.find(p => p.id === String(id)) || state.pipelines.find((p) => String(p.id) === String(id))) : null;

  if (id) {
    if (loadingDetail) {
      return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <RotateCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-mono text-gray-500">fetching pipeline architecture...</p>
          </div>
        </div>
      );
    }
    if (selectedPipeline) {
      return <PipelineDetail pipeline={selectedPipeline} onBack={() => navigate('/app/pipelines')} />;
    }
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Pipeline not found or error loading details.</p>
          <button onClick={() => navigate('/app/pipelines')} className="btn-secondary">Back to Catalog</button>
        </div>
      </div>
    );
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
                {filtered.map((p) => {
                  const conn = connectorMap[p.connector_id];
                  return (
                    <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                            {p.name}
                          </span>
                          {p.description && (
                            <span className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 truncate max-w-xs">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {conn ? (
                          <div className="flex items-center gap-2">
                            <ConnectorIcon type={conn.type} size={14} />
                            <span className="text-[11px] font-bold text-[#4B5563]">{conn.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#9CA3AF]">ID: {p.connector_id}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <PipelineStatusBadge status={p.last_run_status || p.status} />
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-[#9CA3AF]">
                        {timeAgo(p.last_run_at)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}



function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function MetricCard({ label, value, children, accent = 'gray' }: { 
  label: string; 
  value?: string | number; 
  children?: React.ReactNode;
  accent?: 'blue' | 'emerald' | 'rose' | 'gray';
}) {
  const accentMap = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    gray: 'text-[#111827]'
  };
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">
        {label}
      </div>
      <div className={cn("text-xl font-bold tabular-nums", accentMap[accent])}>
        {children ?? value ?? '—'}
      </div>
    </div>
  );
}

function PipelineDetail({ pipeline, onBack }: { pipeline: Pipeline; onBack: () => void }) {
  const { state } = useStore();
  
  // Calculations
  const runs = pipeline.runs || [];
  const completedRuns = runs.filter(r => r.status === 'SUCCEEDED' || r.status === 'FAILED');
  const successCount = runs.filter(r => r.status === 'SUCCEEDED').length;
  const successRate = completedRuns.length ? Math.round((successCount / completedRuns.length) * 100) : null;
  
  const avgDuration = useMemo(() => {
    const durations = runs.filter(r => r.duration_seconds != null).map(r => r.duration_seconds as number);
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [runs]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB]">
      <Header
        title={pipeline.name}
        subtitle={`// PIPELINE · ID=${pipeline.id}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:text-[#111827] flex items-center gap-2 transition-all"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              onClick={onBack}
              className="bg-white border border-[#E5E7EB] px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest text-[#4B5563] hover:bg-gray-50 flex items-center gap-2 transition-all"
            >
              <ArrowLeft size={12} /> Catalog
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Last Status">
              <PipelineStatusBadge status={pipeline.last_run_status || pipeline.status} />
            </MetricCard>
            <MetricCard label="Total Runs (Recent)" value={runs.length} />
            <MetricCard 
              label="Success Rate" 
              value={successRate != null ? `${successRate}%` : '—'}
              accent={successRate != null ? (successRate < 80 ? 'rose' : 'emerald') : 'gray'}
            />
            <MetricCard label="Avg Duration" value={formatDuration(avgDuration)} />
          </div>

          {/* Run History Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-[#111827]">Run History</h3>
              </div>
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                Latest {runs.length} Runs
              </span>
            </div>
            
            <div className="overflow-x-auto">
              {runs.length === 0 ? (
                <div className="py-20 text-center">
                  <Clock className="w-10 h-10 text-[#E5E7EB] mx-auto mb-3" />
                  <p className="text-xs text-[#9CA3AF] font-medium">No run history found for this pipeline.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F9FAFB] text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] border-b border-[#F3F4F6]">
                      <th className="px-6 py-3">Run ID</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Started</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Analysis</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-[#F9FAFB] transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-[#111827] group-hover:text-blue-600 transition-colors">
                            {run.external_run_id?.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <PipelineStatusBadge status={run.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-[#4B5563]">
                              {new Date(run.started_at).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#9CA3AF] font-medium">
                              {timeAgo(run.started_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-medium text-[#4B5563]">
                            {formatDuration(run.duration_seconds)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {run.analysis ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase tracking-tight">
                              <Sparkles size={10} /> Available
                            </span>
                          ) : run.status === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-100 uppercase tracking-tight">
                              <AlertCircle size={10} /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF] font-mono">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] hover:text-[#111827] transition-all">
                            Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Topology Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Workflow size={14} className="text-[#9CA3AF]" />
              <h3 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                Topology · Directed Acyclic Graph
              </h3>
            </div>
            <PipelineDAG nodes={pipeline.dag} orientation="horizontal" />
          </div>

        </div>
      </div>
    </div>
  );
}
