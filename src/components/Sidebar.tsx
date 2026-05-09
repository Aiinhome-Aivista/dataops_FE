import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  History,
  Database,
  Brain,
  Lightbulb,
  Plug,
  Zap,
  Wrench,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../hooks/useStore';

const NAV = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/pipelines', icon: Database, label: 'Pipelines' },
  { to: '/app/incidents', icon: ShieldAlert, label: 'Incident Loop' },
  { to: '/app/agents', icon: Brain, label: 'Agent Mesh' },
  { to: '/app/memory', icon: History, label: 'Memory' },
  { to: '/app/recommendations', icon: Lightbulb, label: 'Optimize' },
  { to: '/app/connectors', icon: Plug, label: 'Connectors' },
  { to: '/app/audit', icon: Wrench, label: 'Audit Trail' },
];

export function Sidebar() {
  const { state } = useStore();
  const navigate = useNavigate();

  const openIncidents = state.incidents.filter(
    (i) => i.status !== 'Remediated' && i.status !== 'Escalated',
  ).length;

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0">
      <div className="px-7 pt-8 pb-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 mb-10 group">
          <div className="w-9 h-9 rounded-md bg-[#111827] flex items-center justify-center relative overflow-hidden">
            <Zap className="w-5 h-5 text-white relative z-10" fill="currentColor" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827] opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="font-semibold tracking-tight text-[15px]">
              AGENTIC<span className="text-gray-400">OPS</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] mt-1">
              Autonomous DataOps
            </span>
          </div>
        </button>

        <nav className="space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-[13px] font-medium',
                  isActive
                    ? 'bg-[#F3F4F6] text-[#111827]'
                    : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]',
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/app/incidents' && openIncidents > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#111827] text-white text-[10px] font-bold">
                  {openIncidents}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-7 border-t border-[#E5E7EB]">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
            Stream
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                state.connected ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            <span className="text-[9px] uppercase tracking-tight font-bold text-[#6B7280]">
              {state.connected ? 'Live' : 'Reconnecting'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
