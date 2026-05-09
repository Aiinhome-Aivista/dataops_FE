/**
 * Data adapters — map DataOps_1 backend shapes into the legacy types
 * expected by the existing dataops_FE UI components.
 */

import type {
  Pipeline,
  PipelineStatus,
  Incident,
  IncidentStatus,
  RiskTier,
  AgentStatus,
  LogEntry,
  HealthMetric,
  MetricsSummary,
  Recommendation,
  ConnectorDetail
} from '../types';


import type {
  PipelineRaw,
  PipelineRunRaw,
  DashboardStatsRaw,
  ConnectorRaw,
} from './api';

// ── Pipeline mapping ────────────────────────────────────────────────

function pipelineStatus(lastRunStatus: string | null): PipelineStatus {
  if (!lastRunStatus) return 'paused';
  switch (lastRunStatus.toUpperCase()) {
    case 'SUCCEEDED': return 'healthy';
    case 'RUNNING':   return 'healthy';
    case 'FAILED':    return 'unhealthy';
    default:          return 'degraded';
  }
}

export function mapPipeline(raw: PipelineRaw): Pipeline {
  return {
    id: String(raw.id),
    name: raw.name,
    status: pipelineStatus(raw.last_run_status),
    last_run: raw.last_run_at ?? 'never',
    throughput: 0,
    latency: 0,
    schedule: '—',
    owner: raw.connector_type || '—',
    sla_minutes: 0,
    dag: [],
    resource_metrics: [],
    tags: raw.connector_type ? [raw.connector_type] : [],
  };
}

// ── Incident mapping (from failed runs) ─────────────────────────────

function riskFromSeverity(severity?: string): RiskTier {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':   return 'High';
    case 'medium': return 'Medium';
    default:       return 'Low';
  }
}

function incidentStatus(run: PipelineRunRaw): IncidentStatus {
  if (run.analysis) {
    if (run.analysis.auto_fixable) return 'Awaiting Approval';
    return 'Remediated';
  }
  return 'Detected';
}

export function mapRunToIncident(run: PipelineRunRaw, pipeline: PipelineRaw): Incident {
  return {
    id: String(run.id),
    pipeline_id: String(pipeline.id),
    pipeline_name: pipeline.name,
    status: incidentStatus(run),
    risk_tier: riskFromSeverity(run.analysis?.severity),
    detected_at: run.started_at || new Date().toISOString(),
    resolved_at: run.finished_at,
    error_log: run.error_log || 'No error log available',
    failed_node: null,
    root_cause: run.analysis?.root_cause || null,
    proposed_action: run.analysis?.recommendation || null,
    agent_thought: run.analysis?.root_cause || null,
    remediation_plan: run.analysis?.recommendation ? [run.analysis.recommendation] : null,
    similar_incidents: [],
    confidence_score: run.analysis?.confidence ?? null,
    tool_calls: [],
    timeline: [
      {
        ts: run.started_at || new Date().toISOString(),
        stage: 'Detected',
        agent: 'monitoring',
        detail: `Run ${run.external_run_id} failed`,
      },
      ...(run.analysis
        ? [
            {
              ts: run.finished_at || new Date().toISOString(),
              stage: 'Diagnosed',
              agent: 'diagnosis',
              detail: run.analysis.root_cause || 'Analysis completed',
            },
          ]
        : []),
    ],
  };
}

/**
 * Extract all failed runs from a list of pipelines and convert to incidents.
 */
export function deriveIncidents(pipelines: PipelineRaw[]): Incident[] {
  const incidents: Incident[] = [];
  for (const p of pipelines) {
    for (const run of (p.runs || [])) {
      if (run.status === 'FAILED') {
        incidents.push(mapRunToIncident(run, p));
      }
    }
  }
  // Sort newest first
  incidents.sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  return incidents;
}

// ── Dashboard stats mapping ─────────────────────────────────────────

export function mapStatsToMetricsSummary(stats: DashboardStatsRaw): MetricsSummary {
  return {
    mttr_avg: 0,
    mttd_avg: 0,
    auto_recovery_pct: stats.success_rate_24h,
    toil_saved_pct: 0,
    incidents_open: stats.failed_runs_24h,
    incidents_total: stats.runs_last_24h,
  };
}

export function mapStatsToHealthMetrics(stats: DashboardStatsRaw): HealthMetric[] {
  // Generate a simple 8-point time series for the charts
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => {
    const t = new Date(now - (7 - i) * 3600 * 1000);
    return {
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mttd: Math.max(0, 2 + Math.random() * 3),
      mttr: Math.max(0, 5 + Math.random() * 10),
      success_rate: stats.success_rate_24h + (Math.random() - 0.5) * 5,
      auto_resolved: Math.round(stats.success_rate_24h / 10),
      human_required: Math.round(stats.failed_runs_24h / 8),
    };
  });
}

// ── Recommendation mapping (from run analyses) ──────────────────────

export function deriveRecommendations(pipelines: PipelineRaw[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const p of pipelines) {
    for (const run of (p.runs || [])) {
      if (run.analysis && run.analysis.recommendation) {
        recs.push({
          id: `rec-${run.id}`,
          pipeline_id: String(p.id),
          pipeline_name: p.name,
          title: run.analysis.root_cause || 'Pipeline issue detected',
          detail: run.analysis.recommendation,
          savings: run.analysis.auto_fixable ? 'Auto-fixable' : 'Manual review',
          risk: riskFromSeverity(run.analysis.severity),
          created_at: run.finished_at || run.started_at || new Date().toISOString(),
          status: 'open',
        });
      }
    }
  }
  return recs;
}

// ── Audit log mapping (from run logs) ───────────────────────────────

export function deriveAuditLogs(pipelines: PipelineRaw[]): LogEntry[] {
  const logs: LogEntry[] = [];
  for (const p of pipelines) {
    for (const run of (p.runs || [])) {
      logs.push({
        id: `log-run-${run.id}`,
        time: new Date(run.started_at || Date.now()).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        msg: `Pipeline "${p.name}" run ${run.external_run_id} → ${run.status}`,
        type: run.status === 'FAILED' ? 'error' : 'info',
        agent_role: null,
        incident_id: run.status === 'FAILED' ? String(run.id) : null,
      });
    }
  }
  logs.sort((a, b) => (b.time > a.time ? 1 : -1));
  return logs.slice(0, 300);
}

// ── Agent stubs ─────────────────────────────────────────────────────

export function defaultAgents(): AgentStatus[] {
  return [
    { role: 'orchestrator', name: 'Orchestrator', description: 'Coordinates the agent mesh', color: '#64748B', status: 'idle', last_action: '—', tasks_completed: 0 },
    { role: 'monitoring',   name: 'Monitor',      description: 'Watches pipeline health',    color: '#3B82F6', status: 'idle', last_action: '—', tasks_completed: 0 },
    { role: 'diagnosis',    name: 'Diagnosis',     description: 'Root cause analysis',        color: '#8B5CF6', status: 'idle', last_action: '—', tasks_completed: 0 },
    { role: 'remediation',  name: 'Remediation',   description: 'Executes fixes',             color: '#F59E0B', status: 'idle', last_action: '—', tasks_completed: 0 },
    { role: 'optimization', name: 'Optimization',  description: 'Long-horizon improvements',  color: '#10B981', status: 'idle', last_action: '—', tasks_completed: 0 },
    { role: 'learning',     name: 'Learning',      description: 'Reflexion + memory write',   color: '#6366F1', status: 'idle', last_action: '—', tasks_completed: 0 },
  ];
}

// ── Connector mapping ───────────────────────────────────────────────

export function mapConnector(raw: ConnectorRaw): ConnectorDetail {
  return {
    id: String(raw.id),
    name: raw.name,
    type: raw.type,
    status: (raw.status || 'not_configured') as 'connected' | 'error' | 'pending' | 'not_configured',
    last_sync: raw.last_sync,
    last_error: raw.last_error ?? null,
    description: raw.description ?? undefined,
    type_id: raw.type_id ?? String(raw.id),
    config: raw.config ?? {},
  };
}
