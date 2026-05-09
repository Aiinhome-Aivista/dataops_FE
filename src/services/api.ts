/**
 * API layer — rewired to use DataOps_1 backend.
 *
 * Base URL: VITE_API_BASE env-var, falling back to /api/v1 (so the
 * Vite dev-server proxy handles routing).
 *
 * Auth: localStorage key "auth_token", injected as Bearer header.
 */

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api/v1';
const TOKEN_KEY = 'auth_token';

// ── Auth helpers ────────────────────────────────────────────────────
export const auth = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => !!localStorage.getItem(TOKEN_KEY),
};

// ── Generic request wrapper ─────────────────────────────────────────
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const tok = auth.getToken();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    auth.clearToken();
    if (!path.startsWith('/auth')) {
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

// ── Auth API ────────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  user: { id: number; email: string; full_name: string; is_admin: boolean };
}

export interface MeResponse {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
}

export const authApi = {
  login: (email: string, password: string) =>
    req<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, full_name: string) =>
    req<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
  me: () => req<MeResponse>('/auth/me'),
};

// ── Connectors API ──────────────────────────────────────────────────
export interface ConnectorRaw {
  id: number;
  name: string;
  type: string;
  status: string;
  last_sync: string | null;
  last_error?: string | null;
  description?: string;
  type_id?: string;
  config?: Record<string, unknown>;
}

export const connectorsApi = {
  list: () => req<ConnectorRaw[]>('/connectors'),
  get: (id: string | number) => req<ConnectorRaw>(`/connectors/${id}`),
  create: (payload: { type_id?: string; name?: string; config?: Record<string, unknown>; type?: string }) =>
    req<ConnectorRaw>('/connectors', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string | number, payload: Record<string, unknown>) =>
    req<ConnectorRaw>(`/connectors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string | number) =>
    req<{ ok: boolean }>(`/connectors/${id}`, { method: 'DELETE' }),
  test: (id: string | number) =>
    req<{ status: string; detail: string }>(`/connectors/${id}/test`, { method: 'POST' }),
  sync: (id: string | number) =>
    req<{ ok: boolean }>(`/connectors/${id}/sync`, { method: 'POST' }),
};

// ── Pipelines API ───────────────────────────────────────────────────
export interface PipelineRunRaw {
  id: number;
  external_run_id: string;
  status: string;          // SUCCEEDED | FAILED | RUNNING | QUEUED | CANCELLED
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  error_log: string | null;
  analysis?: {
    root_cause?: string;
    severity?: string;
    recommendation?: string;
    auto_fixable?: boolean;
    confidence?: number;
  } | null;
}

export interface PipelineRaw {
  id: number;
  name: string;
  external_id: string;
  description: string | null;
  connector_id: number;
  connector_type: string;
  last_run_status: string | null;
  last_run_at: string | null;
  runs: PipelineRunRaw[];
}

export interface DashboardStatsRaw {
  total_connectors: number;
  total_pipelines: number;
  runs_last_24h: number;
  success_rate_24h: number;
  failed_runs_24h: number;
  pending_analyses: number;
}

export const pipelinesApi = {
  list: (params?: Record<string, string>) =>
    req<PipelineRaw[]>(`/pipelines${params ? '?' + new URLSearchParams(params).toString() : ''}`),
  get: (id: string | number) => req<PipelineRaw>(`/pipelines/${id}`),
  stats: () => req<DashboardStatsRaw>('/dashboard/stats'),
};

// ── Runs API ────────────────────────────────────────────────────────
export interface RunLogRaw {
  id: number;
  line: string;
  level: string;
  timestamp: string;
}

export interface RunAnalysisRaw {
  root_cause: string;
  severity: string;
  recommendation: string;
  auto_fixable: boolean;
  confidence: number;
  created_at: string;
}

export const runsApi = {
  get: (id: string | number) => req<PipelineRunRaw>(`/runs/${id}`),
  logs: (id: string | number) => req<RunLogRaw[]>(`/runs/${id}/logs`),
  analysis: (id: string | number) => req<RunAnalysisRaw>(`/runs/${id}/analysis`),
  analyze: (id: string | number, force = false) =>
    req<RunAnalysisRaw>(`/runs/${id}/analyze?force=${force}`, { method: 'POST' }),
  applyFix: (id: string | number) =>
    req<{ ok: boolean }>(`/runs/${id}/auto-fix`, { method: 'POST' }),
};

// ── WebSocket URL builder ───────────────────────────────────────────
export function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const tok = auth.getToken() || '';
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(tok)}`;
}

// ── Legacy-compatible façade (used by existing pages) ───────────────
// Wraps the above APIs behind a single `api.*` object so pages that
// still import `{ api }` continue to compile.  Missing endpoints
// return empty arrays / no-ops.

export const api = {
  // Auth
  login: (email: string, password: string) => authApi.login(email, password).then((r) => ({ access_token: r.access_token, expires_in: 3600 })),
  me: () => authApi.me().then((u) => ({ id: String(u.id), email: u.email, is_admin: u.is_admin })),

  // Pipelines
  pipelines: () => pipelinesApi.list(),
  pipeline: (id: string) => pipelinesApi.get(id),
  stats: () => pipelinesApi.stats(),

  // Connectors
  connectors: () => connectorsApi.list(),
  getConnector: (id: string) => connectorsApi.get(id),
  connectorTypes: () => Promise.resolve([] as never[]),   // not available in DataOps_1
  upsertConnector: (body: { type_id: string; name?: string; config: Record<string, unknown> }) =>
    connectorsApi.create({
      name: body.name,
      type: body.type_id,
      credentials: {
        type: body.type_id,
        ...body.config,
      },
    } as any),
  deleteConnector: (id: string) => connectorsApi.remove(id),
  testConnector: (id: string) => connectorsApi.test(id),

  // Runs
  runDetail: (id: string) => runsApi.get(id),
  runLogs: (id: string) => runsApi.logs(id),
  runAnalysis: (id: string) => runsApi.analysis(id),
  runAnalyze: (id: string, force = false) => runsApi.analyze(id, force),
  runAutoFix: (id: string) => runsApi.applyFix(id),

  // ── Endpoints that DON'T EXIST in DataOps_1 ──
  // Return empty arrays / no-ops so the UI degrades gracefully.
  health: () => Promise.resolve({ status: 'ok', env: 'production', llm: 'n/a' }),
  incidents: () => Promise.resolve([]),
  incident: (_id: string) => Promise.reject(new Error('not available')),
  triggerIncident: (_body: Record<string, unknown>) => Promise.reject(new Error('not available')),
  approveIncident: (_id: string) => Promise.resolve({ ok: true }),
  rejectIncident: (_id: string) => Promise.resolve({ ok: true }),
  deleteIncidents: (_p: { status: string }) => Promise.resolve({ deleted: 0, status: 'ok' }),
  agents: () => Promise.resolve([]),
  memory: (_kind?: string) => Promise.resolve([]),
  searchMemory: (_q: string, _kind?: string, _k?: number) => Promise.resolve([]),
  createMemory: (_entry: Record<string, unknown>) => Promise.reject(new Error('not available')),
  audit: (_limit?: number) => Promise.resolve([]),
  tools: () => Promise.resolve([]),
  recommendations: () => Promise.resolve([]),
  regenerateRecommendations: () => Promise.resolve({ count: 0, items: [] }),
  updateRecommendation: (_id: string, _status: string) => Promise.reject(new Error('not available')),
  metricsHealth: () => Promise.resolve([]),
  metricsSummary: () => Promise.resolve({
    mttr_avg: 0,
    mttd_avg: 0,
    auto_recovery_pct: 0,
    toil_saved_pct: 0,
    incidents_open: 0,
    incidents_total: 0,
  }),
};
