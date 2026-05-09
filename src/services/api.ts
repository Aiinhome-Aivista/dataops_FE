import type {
  AgentStatus,
  Connector,
  ConnectorDetail,
  ConnectorType,
  HealthMetric,
  Incident,
  LogEntry,
  MemoryEntry,
  MetricsSummary,
  Pipeline,
  Recommendation,
  ToolSpec,
} from '../types';

const BASE = 'http://122.163.121.176:3004';
const TOKEN_KEY = 'dataops:jwt';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => !!localStorage.getItem(TOKEN_KEY),
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const tok = auth.getToken();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    auth.clearToken();
    if (!path.startsWith('/api/auth')) {
      window.location.href = '/login';
    }
    throw new Error('unauthenticated');
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ access_token: string; expires_in: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ id: string; email: string; is_admin: boolean }>('/api/auth/me'),
  health: () => req<{ status: string; env: string; llm: string }>('/api/health'),

  pipelines: () => req<Pipeline[]>('/api/pipelines'),
  pipeline: (id: string) => req<Pipeline>(`/api/pipelines/${id}`),

  incidents: () => req<Incident[]>('/api/incidents'),
  incident: (id: string) => req<Incident>(`/api/incidents/${id}`),
  triggerIncident: (body: { pipeline_id?: string; pipeline_name?: string; run_id?: string; error_log?: string; failed_node?: string }) =>
    req<Incident>('/api/incidents/trigger', { method: 'POST', body: JSON.stringify(body) }),
  approveIncident: (id: string) => req<{ ok: boolean }>(`/api/incidents/${id}/approve`, { method: 'POST' }),
  rejectIncident: (id: string) => req<{ ok: boolean }>(`/api/incidents/${id}/reject`, { method: 'POST' }),
  deleteIncident: (id: string) =>
    fetch(`/api/incidents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.getToken() || ''}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`${r.status} ${r.statusText}`);
    }),
  deleteIncidents: ({ status }: { status: 'closed' | 'open' | 'all' }) =>
    fetch(`/api/incidents?status=${status}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.getToken() || ''}` },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<{ deleted: number; status: string }>;
    }),

  agents: () => req<AgentStatus[]>('/api/agents'),

  memory: (kind?: string) => req<MemoryEntry[]>(`/api/memory${kind ? `?kind=${kind}` : ''}`),
  searchMemory: (q: string, kind = 'episodic', k = 5) =>
    req<MemoryEntry[]>(`/api/memory/search?q=${encodeURIComponent(q)}&kind=${kind}&k=${k}`),
  createMemory: (entry: Omit<MemoryEntry, 'id' | 'created_at' | 'times_referenced'>) =>
    req<MemoryEntry>('/api/memory', { method: 'POST', body: JSON.stringify(entry) }),

  audit: (limit = 200) => req<LogEntry[]>(`/api/audit?limit=${limit}`),
  connectors: () => req<Connector[]>('/api/connectors'),
  connectorTypes: () => req<ConnectorType[]>('/api/connectors/types'),
  getConnector: (id: string) => req<ConnectorDetail>(`/api/connectors/${id}`),
  upsertConnector: (body: { type_id: string; name?: string; config: Record<string, any> }) =>
    req<ConnectorDetail>('/api/connectors', { method: 'POST', body: JSON.stringify(body) }),
  deleteConnector: (id: string) =>
    fetch(`/api/connectors/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.getToken() || ''}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error(`${r.status} ${r.statusText}`);
    }),
  testConnector: (id: string) =>
    req<{ status: string; detail: string }>(`/api/connectors/${id}/test`, { method: 'POST' }),
  tools: () => req<ToolSpec[]>('/api/tools'),

  recommendations: () => req<Recommendation[]>('/api/recommendations'),
  regenerateRecommendations: () => req<{ count: number; items: Recommendation[] }>('/api/recommendations/regenerate', { method: 'POST' }),
  updateRecommendation: (id: string, status: 'open' | 'accepted' | 'dismissed') =>
    req<Recommendation>(`/api/recommendations/${id}`, { method: 'POST', body: JSON.stringify({ status }) }),

  metricsHealth: () => req<HealthMetric[]>('/api/metrics/health'),
  metricsSummary: () => req<MetricsSummary>('/api/metrics/summary'),
};

export function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const tok = auth.getToken() || '';
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(tok)}`;
}
