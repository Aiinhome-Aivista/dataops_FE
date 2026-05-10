import type {
  AgentStatus,
  Connector,
  ConnectorDetail,
  ConnectorType,
  DashboardStats,
  HealthMetric,
  Incident,
  LogEntry,
  MemoryEntry,
  MetricsSummary,
  Pipeline,
  Recommendation,
  ToolSpec,
} from "../types";

const BASE = "/api/v1";
const TOKEN_KEY = "auth_token";

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isAuthed: () => !!localStorage.getItem(TOKEN_KEY),
};

let activeRequests = 0;
let loadingListener: ((loading: boolean) => void) | null = null;

export const apiEvents = {
  onLoading: (cb: (loading: boolean) => void) => { loadingListener = cb; }
};

function updateLoading(delta: number) {
  activeRequests += delta;
  loadingListener?.(activeRequests > 0);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  updateLoading(1);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      ...(init?.headers as Record<string, string> | undefined),
    };
    const tok = auth.getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const res = await fetch(`${BASE}${path}`, { 
      ...init, 
      headers,
      cache: 'no-store'
    });
    if (res.status === 401) {
      auth.clearToken();
      if (!path.startsWith("/auth")) {
        window.location.href = "/login";
      }
      throw new Error("unauthenticated");
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
  } finally {
    updateLoading(-1);
  }
}

export const api = {
  login: (email: string, password: string) =>
    req<{ access_token: string; expires_in: number }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ id: string; email: string; is_admin: boolean }>("/auth/me"),
  health: () => req<{ status: string; env: string; llm: string }>("/health"),

  pipelines: (params?: { connector_id?: string | number }) => {
    const q = params?.connector_id ? `?connector_id=${params.connector_id}` : '';
    return req<Pipeline[]>(`/pipelines${q}`);
  },
  pipeline: (id: string) => req<Pipeline>(`/pipelines/${id}`),
  run: (id: string) => req<any>(`/runs/${id}`),
  runLogs: (id: string) => req<any[]>(`/runs/${id}/logs`),
  runAnalysis: (id: string) => req<any>(`/runs/${id}/analysis`),
  triggerRunAnalysis: (id: string, force: boolean = false) =>
    req<any>(`/runs/${id}/analyze${force ? "?force=true" : ""}`, {
      method: "POST",
    }),

  incidents: () => req<Incident[]>("/incidents"),
  incident: (id: string) => req<Incident>(`/incidents/${id}`),
  triggerIncident: (body: {
    pipeline_id?: string;
    pipeline_name?: string;
    run_id?: string;
    error_log?: string;
    failed_node?: string;
  }) =>
    req<Incident>("/incidents/trigger", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  approveIncident: (id: string) =>
    req<{ ok: boolean }>(`/incidents/${id}/approve`, { method: "POST" }),
  rejectIncident: (id: string) =>
    req<{ ok: boolean }>(`/incidents/${id}/reject`, { method: "POST" }),
  deleteIncident: (id: string) =>
    fetch(`${BASE}/incidents/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204)
        throw new Error(`${r.status} ${r.statusText}`);
    }),
  deleteIncidents: ({ status }: { status: "closed" | "open" | "all" }) =>
    fetch(`${BASE}/incidents?status=${status}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json() as Promise<{ deleted: number; status: string }>;
    }),

  // agents: () => req<AgentStatus[]>("/agents"), // Disabled: Not needed for current version

  memory: (kind?: string) =>
    req<MemoryEntry[]>(`/memory${kind ? `?kind=${kind}` : ""}`),
  searchMemory: (q: string, kind = "episodic", k = 5) =>
    req<MemoryEntry[]>(
      `/memory/search?q=${encodeURIComponent(q)}&kind=${kind}&k=${k}`,
    ),
  createMemory: (
    entry: Omit<MemoryEntry, "id" | "created_at" | "times_referenced">,
  ) =>
    req<MemoryEntry>("/memory", {
      method: "POST",
      body: JSON.stringify(entry),
    }),

  audit: (limit = 200) => req<LogEntry[]>(`/audit?limit=${limit}`),
  connectors: () => req<Connector[]>("/connectors"),
  connectorTypes: () => req<ConnectorType[]>("/connectors/types"),
  getConnector: (id: string) => req<ConnectorDetail>(`/connectors/${id}`),
  upsertConnector: (body: {
    type: string;
    name?: string;
    credentials: Record<string, any>;
  }) =>
    req<ConnectorDetail>("/connectors", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteConnector: (id: string) =>
    fetch(`${BASE}/connectors/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.getToken() || ""}` },
    }).then((r) => {
      if (!r.ok && r.status !== 204)
        throw new Error(`${r.status} ${r.statusText}`);
    }),
  testConnector: (id: string) =>
    req<{ status: string; detail: string }>(`/connectors/${id}/test`, {
      method: "POST",
    }),
  syncConnector: (id: string) =>
    req<{ queued: boolean; stats: any }>(`/connectors/${id}/sync`, {
      method: "POST",
    }),
  tools: () => req<ToolSpec[]>("/tools"),

  recommendations: () => req<Recommendation[]>("/recommendations"),
  regenerateRecommendations: () =>
    req<{ count: number; items: Recommendation[] }>(
      "/recommendations/regenerate",
      { method: "POST" },
    ),
  updateRecommendation: (
    id: string,
    status: "open" | "accepted" | "dismissed",
  ) =>
    req<Recommendation>(`/recommendations/${id}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  metricsHealth: () => req<HealthMetric[]>("/metrics/health"),
  metricsSummary: () => req<MetricsSummary>("/metrics/summary"),
  stats: () => req<DashboardStats>("/dashboard/stats"),
};

export function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const tok = auth.getToken() || "";
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(tok)}`;
}
