import { type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider } from './hooks/useStore';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/Dashboard';
import { PipelinesPage } from './pages/Pipelines';
import { IncidentsPage } from './pages/Incidents';
import { AgentsPage } from './pages/Agents';
import { MemoryPage } from './pages/Memory';
import { RecommendationsPage } from './pages/Recommendations';
import { ConnectorsPage } from './pages/Connectors';
import { AuditPage } from './pages/Audit';
import { LoginPage } from './pages/Login';
import { LandingPage } from './pages/Landing';
import { auth } from './services/api';

function RequireAuth({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!auth.isAuthed()) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }
  return <>{children}</>;
}

function Shell() {
  return (
    <StoreProvider>
      <div className="flex h-screen bg-[#F9FAFB] text-[#111827] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pipelines" element={<PipelinesPage />} />
            <Route path="/pipelines/:id" element={<PipelinesPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentsPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/connectors" element={<ConnectorsPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Routes>
        </div>
      </div>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
