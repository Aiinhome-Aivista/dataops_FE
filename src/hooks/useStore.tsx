/**
 * Global store — rewired for DataOps_1 backend.
 *
 * Bootstrap fetches pipelines + stats, then derives incidents, agents,
 * and logs from the pipeline/run data.  A WebSocket connection pushes
 * live events into the reducer.
 */

import { useEffect, useReducer, useRef, createContext, useContext, type ReactNode } from 'react';
import type { AgentStatus, Incident, LogEntry, Pipeline } from '../types';
import { pipelinesApi, connectorsApi, runsApi, wsUrl } from '../services/api';
import type { PipelineRaw } from '../services/api';
import {
  mapPipeline,
  deriveIncidents,
  deriveAuditLogs,
  defaultAgents,
} from '../services/adapters';

// ── State ───────────────────────────────────────────────────────────

interface State {
  pipelines: Pipeline[];
  pipelinesRaw: PipelineRaw[];       // keep raw for incident derivation
  incidents: Incident[];
  agents: AgentStatus[];
  logs: LogEntry[];
  simulating: boolean;
  connected: boolean;
  activeAgentRoles: Record<string, number>;
}

type Action =
  | { type: 'bootstrap'; payload: { pipelinesRaw: PipelineRaw[] } }
  | { type: 'pipelines'; payload: Pipeline[] }
  | { type: 'incident'; payload: Incident }
  | { type: 'log'; payload: LogEntry }
  | { type: 'agents'; payload: AgentStatus[] }
  | { type: 'agent_started'; payload: { role: string; name: string; last_action: string } }
  | { type: 'agent_completed'; payload: { role: string; name: string; last_action: string } }
  | { type: 'simulating'; payload: boolean }
  | { type: 'connected'; payload: boolean };

const initial: State = {
  pipelines: [],
  pipelinesRaw: [],
  incidents: [],
  agents: defaultAgents(),
  logs: [],
  simulating: false,
  connected: false,
  activeAgentRoles: {},
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'bootstrap': {
      const raw = action.payload.pipelinesRaw;
      return {
        ...state,
        pipelinesRaw: raw,
        pipelines: raw.map(mapPipeline),
        incidents: deriveIncidents(raw),
        logs: deriveAuditLogs(raw),
        agents: defaultAgents(),
      };
    }
    case 'pipelines':
      return { ...state, pipelines: action.payload };
    case 'incident': {
      const incoming = action.payload;
      const idx = state.incidents.findIndex((i) => i.id === incoming.id);
      const incidents =
        idx >= 0
          ? state.incidents.map((i, k) => (k === idx ? incoming : i))
          : [incoming, ...state.incidents];
      return { ...state, incidents };
    }
    case 'log':
      return { ...state, logs: [action.payload, ...state.logs].slice(0, 300) };
    case 'agents':
      return { ...state, agents: action.payload };
    case 'agent_started': {
      const agents = state.agents.map((a) =>
        a.role === action.payload.role
          ? { ...a, status: 'thinking' as const, last_action: action.payload.last_action }
          : a,
      );
      return {
        ...state,
        agents,
        activeAgentRoles: {
          ...state.activeAgentRoles,
          [action.payload.role]: Date.now() + 6000,
        },
      };
    }
    case 'agent_completed': {
      const agents = state.agents.map((a) =>
        a.role === action.payload.role
          ? { ...a, status: 'idle' as const, tasks_completed: a.tasks_completed + 1 }
          : a,
      );
      const next = { ...state.activeAgentRoles };
      delete next[action.payload.role];
      return { ...state, agents, activeAgentRoles: next };
    }
    case 'simulating':
      return { ...state, simulating: action.payload };
    case 'connected':
      return { ...state, connected: action.payload };
  }
}

// ── Context ─────────────────────────────────────────────────────────

type Ctx = {
  state: State;
  triggerIncident: () => Promise<void>;
  toggleSimulation: () => Promise<void>;
  approveIncident: (id: string) => Promise<void>;
  rejectIncident: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // ── Bootstrap from REST ───────────────────────────────────────────
  const bootstrap = async () => {
    try {
      const pipelinesRaw = await pipelinesApi.list();
      dispatch({ type: 'bootstrap', payload: { pipelinesRaw } });
    } catch (e) {
      console.warn('Bootstrap failed', e);
    }
  };

  // ── WebSocket lifecycle ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      try {
        const url = wsUrl();
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          dispatch({ type: 'connected', payload: true });
        };
        ws.onclose = () => {
          if (cancelled) return;
          dispatch({ type: 'connected', payload: false });
          reconnectTimerRef.current = window.setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          // onclose fires next
        };
        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            handleEvent(msg);
          } catch (e) {
            console.warn('Bad WS payload', e);
          }
        };
      } catch {
        // WebSocket constructor can throw if URL is invalid
        reconnectTimerRef.current = window.setTimeout(connect, 5000);
      }
    };

    const handleEvent = (msg: { event: string; data?: Record<string, unknown>; payload?: Record<string, unknown> }) => {
      const data = msg.data || msg.payload || {};
      switch (msg.event) {
        case 'run.updated':
        case 'pipeline.created':
        case 'analysis.ready':
        case 'connector.synced':
          // Re-fetch fresh data
          bootstrap();
          break;
        case 'agent_started':
          dispatch({ type: 'agent_started', payload: data as { role: string; name: string; last_action: string } });
          break;
        case 'agent_completed':
          dispatch({ type: 'agent_completed', payload: data as { role: string; name: string; last_action: string } });
          break;
        default:
          break;
      }
    };

    bootstrap();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  // ── Periodic refresh (every 30s) ──────────────────────────────────
  useEffect(() => {
    const t = window.setInterval(() => {
      bootstrap();
    }, 30000);
    return () => window.clearInterval(t);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────
  const triggerIncident = async () => {
    console.info('triggerIncident: not available in DataOps_1 backend');
  };

  const toggleSimulation = async () => {
    console.info('toggleSimulation: not available in DataOps_1 backend');
  };

  const approveIncident = async (_id: string) => {
    // Map to auto-fix on the corresponding run
    try {
      await runsApi.applyFix(_id);
      await bootstrap();
    } catch (e) {
      console.warn('approveIncident failed', e);
    }
  };

  const rejectIncident = async (_id: string) => {
    console.info('rejectIncident: no-op — run will remain in failed state');
  };

  const ctx: Ctx = {
    state,
    triggerIncident,
    toggleSimulation,
    approveIncident,
    rejectIncident,
    refresh: bootstrap,
  };

  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
