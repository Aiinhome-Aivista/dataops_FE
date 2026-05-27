import { auth } from "./api";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "/api/v1";

async function http<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const tok = auth.getToken();
  if (tok) {
    headers["Authorization"] = `Bearer ${tok}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} – ${body}`);
  }
  return res.json();
}

// ── LLM ───────────────────────────────────────────────────────

export type LLMMode = "Cloud" | "Local";

export interface LLMConfig {
  mode: LLMMode;
  cloud_model: string;
  local_url: string;
  local_model: string;
  temperature: number;
  max_tokens: number;
}

export interface LLMHealth {
  mode: LLMMode;
  backend: { ok: boolean; model: string; error?: string };
  config: LLMConfig;
}

export interface LLMHealthBoth {
  active_mode: LLMMode;
  Cloud: { ok: boolean; model: string; error?: string };
  Local: { ok: boolean; model: string; error?: string; endpoint?: string };
}

export const llmApi = {
  getMode:     () => http<{ mode: LLMMode } & LLMConfig>("/llm/mode"),
  setMode:     (mode: LLMMode, persist = true) =>
                 http<{ mode: LLMMode; ok: boolean; health: LLMHealth }>(
                   "/llm/mode",
                   { method: "POST", body: JSON.stringify({ mode, persist }) },
                 ),
  health:      () => http<LLMHealth>("/llm/health"),
  healthBoth:  () => http<LLMHealthBoth>("/llm/health/both"),
  chat:        (prompt: string, opts?: { system?: string; temperature?: number; max_tokens?: number }) =>
                 http<{ ok: boolean; mode: LLMMode; response: string }>(
                   "/llm/chat",
                   { method: "POST", body: JSON.stringify({ prompt, ...opts }) },
                 ),
};

// ── Graph ─────────────────────────────────────────────────────

export interface FixCandidate {
  fix: string;
  fix_id: string;
  score: number;
  matched_patterns: string[];
  supporting_runbooks: string[];
  success_count: number;
  failure_count: number;
}

export interface GraphStats {
  enabled: boolean;
  counts: Record<string, number>;
}

export interface GraphNode { id: string; label: string; type: string; }
export interface GraphEdge { from: string; to: string; label: string; }
export interface Subgraph  { nodes: GraphNode[]; edges: GraphEdge[]; }

export const graphApi = {
  stats:       () => http<GraphStats>("/graph/stats"),

  recommend:   (error_text: string, component?: string, top_k = 5) =>
                 http<{ enabled: boolean; candidates: FixCandidate[] }>(
                   "/graph/recommend",
                   { method: "POST",
                     body: JSON.stringify({ error_text, component, top_k }) },
                 ),

  subgraph:    (runbookId: string) =>
                 http<Subgraph>(`/graph/runbook/${encodeURIComponent(runbookId)}/subgraph`),

  explainFix:  (fixId: string) => {
                 const b64 = btoa(fixId).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
                 return http<{
                   enabled: boolean; fix: string;
                   patterns: { signature: string; weight: number; keywords: string[] }[];
                   runbooks: { title: string; category: string; order: number }[];
                   incidents: { id: string; pipeline: string; summary: string; success: boolean }[];
                   success_rate: number | null;
                 }>(`/graph/fix/${b64}/explain`);
               },

  recordOutcome: (payload: {
                   incident_id: string;
                   pipeline_name: string;
                   summary: string;
                   confidence?: number;
                   matched_pattern_signatures?: string[];
                   applied_fixes?: string[];
                   success?: boolean;
                 }) =>
                 http("/graph/incident-outcome",
                      { method: "POST", body: JSON.stringify(payload) }),
};
