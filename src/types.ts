export type RiskTier = 'Low' | 'Medium' | 'High';

export type IncidentStatus =
  | 'Detected'
  | 'Reasoning'
  | 'Planning'
  | 'Awaiting Approval'
  | 'Executing'
  | 'Evaluating'
  | 'Remediated'
  | 'Failed'
  | 'Escalated';

export type PipelineStatus = 'healthy' | 'unhealthy' | 'degraded' | 'paused';

export type AgentRoleId =
  | 'orchestrator'
  | 'monitoring'
  | 'diagnosis'
  | 'remediation'
  | 'optimization'
  | 'learning';

export type ConnectorTypeId =
  | 'Orchestrator'
  | 'Monitoring'
  | 'Logs'
  | 'Ticketing'
  | 'Communication'
  | 'Git'
  | 'Runtime'
  | 'Cloud';

export type NodeTypeId = 'sensor' | 'ingest' | 'transform' | 'load';

export interface DAGNode {
  id: string;
  name: string;
  type: NodeTypeId;
  dependencies: string[];
  avg_runtime_sec?: number;
}

export interface ResourceMetric {
  time: string;
  cpu: number;
  memory: number;
  io: number;
}

export interface Pipeline {
  id: string;
  connector_id: number;
  name: string;
  description?: string | null;
  status: PipelineStatus;
  last_run: string;
  throughput: number;
  latency: number;
  schedule: string;
  owner: string;
  sla_minutes: number;
  dag: DAGNode[];
  resource_metrics: ResourceMetric[];
  last_run_status?: string;
  last_run_at?: string;
  created_at?: string;
  tags: string[];
}

export interface ToolCallRecord {
  tool: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  status?: string;
  duration_ms?: number;
}

export interface IncidentTimelineEntry {
  ts: string;
  stage: string;
  agent: string;
  detail: string;
}

export interface Incident {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  status: IncidentStatus;
  risk_tier: RiskTier;
  detected_at: string;
  resolved_at?: string | null;
  error_log: string;
  failed_node?: string | null;
  root_cause?: string | null;
  proposed_action?: string | null;
  agent_thought?: string | null;
  remediation_plan?: string[] | null;
  similar_incidents: string[];
  confidence_score?: number | null;
  tool_calls: ToolCallRecord[];
  timeline: IncidentTimelineEntry[];
}

export interface AgentStatus {
  role: AgentRoleId;
  name: string;
  description: string;
  color: string;
  status: 'idle' | 'thinking' | 'acting' | 'error';
  last_action: string;
  tasks_completed: number;
}

export interface Connector {
  id: string;
  name: string;
  type: ConnectorTypeId | string;
  status: 'CONNECTED' | 'ERROR' | 'PENDING' | 'NOT_CONFIGURED' | string;
  last_synced_at: string | null;
  last_error?: string | null;
  description?: string;
}

export interface ConnectorDetail extends Connector {
  type_id: string;
  config: Record<string, any>;
}

export interface ConnectorTypeField {
  name: string;
  label: string;
  kind: 'text' | 'password' | 'url' | 'select' | 'textarea' | 'number';
  placeholder?: string;
  required?: boolean;
  secret?: boolean;
  options?: string[];
  help?: string;
  default?: any;
}

export interface ConnectorType {
  type_id: string;
  name: string;
  category: string;
  description: string;
  icon_hint: string;
  fields: ConnectorTypeField[];
}

export interface MemoryEntry {
  id: string;
  kind: 'episodic' | 'semantic' | 'procedural';
  title: string;
  summary: string;
  payload: Record<string, any>;
  tags: string[];
  created_at: string;
  success?: boolean | null;
  times_referenced: number;
  similarity?: number;
}

export interface LogEntry {
  id: string;
  time: string;
  msg: string;
  type: 'info' | 'warn' | 'error' | 'agent' | 'tool';
  agent_role?: AgentRoleId | null;
  incident_id?: string | null;
}

export interface DashboardStats {
  total_connectors: number;
  total_pipelines: number;
  runs_last_24h: number;
  success_rate_24h: number;
  failed_runs_24h: number;
  pending_analyses: number;
}

export interface HealthMetric {
  time: string;
  mttd: number;
  mttr: number;
  success_rate: number;
  auto_resolved: number;
  human_required: number;
}

export interface MetricsSummary {
  mttr_avg: number;
  mttd_avg: number;
  auto_recovery_pct: number;
  toil_saved_pct: number;
  incidents_open: number;
  incidents_total: number;
}

export interface Recommendation {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  title: string;
  detail: string;
  savings: string;
  risk: 'Low' | 'Medium' | 'High';
  created_at: string;
  status: 'open' | 'accepted' | 'dismissed';
}

export interface ToolSpec {
  name: string;
  description: string;
  args_schema: Record<string, string>;
  risk: 'low' | 'medium' | 'high';
}
