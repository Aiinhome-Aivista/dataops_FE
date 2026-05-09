# DataOps Frontend Migration Context

**Target:** Migrate legacy `dataops_FE` React application to use the new `DataOps_1` backend API structure.
**Status:** Complete

This file serves as a context manifest for future AI agents working on this repository to quickly understand the architectural constraints and recent API migration logic.

## 1. Environment & API Architecture
* **Backend Source of Truth:** `DataOps_1` backend.
* **Server Address:** `http://122.163.121.176:3004`
* **API Prefix:** `/api/v1`
* **WebSocket Endpoint:** `/ws`
* **Authentication:** Uses `Bearer <token>` injected in the HTTP headers. The token is retrieved from `localStorage` under the key `auth_token`.

Vite is configured to proxy `/api/v1` and `/ws` to the target server, using `changeOrigin: true` to prevent CORS and WebSocket connection rejection.

## 2. The Adapter Pattern (`src/services/adapters.ts`)
The legacy frontend components were tightly coupled to an older backend schema. To avoid rewriting the entire UI layer, an adapter pattern was introduced.
* **Purpose:** Maps incoming `DataOps_1` JSON payloads (e.g., `PipelineRaw`, `ConnectorRaw`) into the legacy structures expected by the UI (`Pipeline`, `ConnectorDetail`, etc.).

## 3. Derived State & Missing Features
The new backend does not support every endpoint the legacy frontend used. Instead of throwing errors, state is derived or degraded gracefully:

* **Incidents (`src/pages/Incidents.tsx`):** The backend does not have a dedicated `/incidents` endpoint. Incidents are dynamically derived in the store (`useStore.tsx`) from any pipeline run where `run.status === 'FAILED'`.
* **Audit Logs (`src/pages/Audit.tsx`):** Derived globally from the history of pipeline runs instead of a distinct `/audit` endpoint.
* **Recommendations (`src/pages/Recommendations.tsx`):** Derived from the `analysis.recommendation` block attached to pipeline runs.
* **Memory & Agents (`src/pages/Memory.tsx`, `Agents.tsx`):** The new backend currently lacks the Qdrant Vector Store integration for RAG. These pages show informational fallback banners rather than executing broken network requests.

## 4. Key Bug Fixes & Edge Cases to Remember
* **Nullable Arrays:** The backend often omits empty arrays. For example, a pipeline with no runs returns undefined instead of `[]`. Iterations require safety fallbacks: `for (const run of (p.runs || []))`.
* **Recharts Layout Warnings:** If you add new `ResponsiveContainer` charts inside Flexbox/Grid containers, ensure you add `minWidth={1}` and `minHeight={1}` to prevent layout measurement warnings (`width(-1) / height(-1)`).
* **Vite WebSockets:** When testing locally, ensure the WebSocket proxy includes `changeOrigin: true`, otherwise the proxy upgrade step will fail.
* **React Router Dom (v6):** When using absolute navigation inside nested routes (`/app/*`), be explicit. E.g., `navigate('/app/pipelines')` instead of `navigate('/pipelines')`.

## 5. Next Steps / Future Work
* Remove "derived" state implementations once the backend officially supports native Incident tracking and Qdrant memory endpoints.
* Upgrade the `Agents` page to subscribe to real-time LangGraph state streams once the backend opens the telemetry port.
