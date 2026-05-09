import { AnimatePresence, motion } from 'motion/react';
import { Database, GitBranch, Workflow, X, Plus, TestTube2, Trash2, ChevronLeft, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Connector } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  connectors: Connector[];
  onChange: () => void;
  initialView?: View;
}

type ConnectorTypeKey = 'ADF' | 'DATABRICKS' | 'GIT';

interface CredMap {
  ADF: {
    type: string; tenant_id: string; subscription_id: string;
    client_id: string; client_secret: string;
    resource_group: string; factory_name: string;
  };
  DATABRICKS: { type: string; workspace_url: string; personal_access_token: string };
  GIT: { type: string; provider: string; token: string; owner: string; repo: string };
}

const TYPE_OPTIONS: { value: ConnectorTypeKey; label: string; help: string; typeId: string }[] = [
  { value: 'ADF',        label: 'Azure Data Factory', help: 'Service Principal via Azure AD', typeId: 'ADF'        },
  { value: 'DATABRICKS', label: 'Databricks',          help: 'Personal Access Token',          typeId: 'DATABRICKS' },
  { value: 'GIT',        label: 'GitHub Actions',      help: 'Personal Access Token',          typeId: 'GIT'        },
];

const EMPTY_CREDS: CredMap = {
  ADF: {
    type: 'ADF', tenant_id: '', subscription_id: '',
    client_id: '', client_secret: '', resource_group: '', factory_name: '',
  },
  DATABRICKS: { type: 'DATABRICKS', workspace_url: '', personal_access_token: '' },
  GIT: { type: 'GIT', provider: 'github', token: '', owner: '', repo: '' },
};

const STATUS_DOT: Record<string, string> = {
  connected:      'bg-emerald-500',
  error:          'bg-red-500',
  not_configured: 'bg-gray-400',
  pending:        'bg-amber-500',
};

// ─── Icon component ───────────────────────────────────────────────────────────

function ConnectorIcon({ type, size = 16 }: { type: string; size?: number }) {
  const cfg: Record<string, { icon: React.ElementType; color: string }> = {
    ADF:        { icon: Workflow,  color: 'text-sky-600'    },
    DATABRICKS: { icon: Database,  color: 'text-amber-600'  },
    GIT:        { icon: GitBranch, color: 'text-violet-600' },
  };
  const { icon: Icon, color } = cfg[type] ?? cfg.ADF;
  return <Icon size={size} className={color} strokeWidth={2.25} />;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type View = 'list' | 'new';

export function ConnectorModal({ open, onClose, connectors, onChange, initialView }: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; detail: string }>>({});

  useEffect(() => {
    if (open) { setView(initialView ?? 'list'); setErr(null); }
  }, [open, initialView]);

  const remove = async (c: Connector) => {
    setBusy(c.id);
    try { await api.deleteConnector(c.id); onChange(); }
    catch (e: any) { setErr(e.message || 'delete failed'); }
    finally { setBusy(null); }
  };

  const test = async (c: Connector) => {
    setBusy(c.id);
    try {
      const r = await api.testConnector(c.id);
      setTestResults(s => ({ ...s, [c.id]: r }));
      onChange();
    } catch (e: any) {
      setTestResults(s => ({ ...s, [c.id]: { status: 'error', detail: e.message } }));
    } finally { setBusy(null); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl my-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3 min-w-0">
                {view === 'new' && (
                  <button onClick={() => setView('list')} className="text-[#6B7280] hover:text-[#111827]">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#111827]">
                    {view === 'list' ? 'Connectors' : 'New connector'}
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {view === 'list'
                      ? 'Add, edit, test, or remove integrations.'
                      : 'Credentials are encrypted at rest with Fernet'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#111827] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {err && (
              <div className="mx-6 mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {err}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {view === 'list' && (
                <ListView
                  connectors={connectors}
                  busy={busy}
                  testResults={testResults}
                  onAdd={() => { setErr(null); setView('new'); }}
                  onTest={test}
                  onDelete={remove}
                  onViewPipelines={(c) => {
                    navigate(`/app/pipelines?connector_id=${c.id}`);
                    onClose();
                  }}
                />
              )}
              {view === 'new' && (
                <NewConnectorForm
                  onSaved={() => { onChange(); setView('list'); }}
                  onError={setErr}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({
  connectors, busy, testResults, onAdd, onTest, onDelete, onViewPipelines,
}: {
  connectors: Connector[];
  busy: string | null;
  testResults: Record<string, { status: string; detail: string }>;
  onAdd: () => void;
  onTest: (c: Connector) => void;
  onDelete: (c: Connector) => void;
  onViewPipelines: (c: Connector) => void;
}) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase font-black tracking-[0.18em] text-[#9CA3AF]">
          Configured connectors ({connectors.length})
        </h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111827] text-white text-xs font-medium hover:bg-black"
        >
          <Plus className="w-3.5 h-3.5" />
          Add connector
        </button>
      </div>

      {connectors.length === 0 && (
        <p className="text-sm text-[#6B7280] py-8 text-center">
          No connectors yet. Click <span className="font-medium">Add connector</span> to get started.
        </p>
      )}

      <div className="space-y-2">
        {connectors.map(conn => {
          const dot = STATUS_DOT[conn.status] || 'bg-gray-400';
          const tr = testResults[conn.id];
          return (
            <div
              key={conn.id}
              className="flex items-start justify-between gap-3 px-4 py-3 border border-[#E5E7EB] rounded-lg bg-white"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                  <ConnectorIcon type={conn.type} size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{conn.name}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">
                    {conn.type}{conn.description ? ` · ${conn.description}` : ''}
                  </p>
                  {conn.last_error && (
                    <p className="text-[11px] text-red-600 mt-1 break-words">{conn.last_error}</p>
                  )}
                  {tr && tr.status !== 'connected' && (
                    <p className="text-[11px] text-amber-700 mt-1 break-words">{tr.detail}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-[11px] text-[#6B7280] capitalize">
                    {conn.status.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => onViewPipelines(conn)}
                  disabled={busy === conn.id}
                  title="View Pipelines"
                  className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-blue-600 disabled:opacity-50"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onTest(conn)}
                  disabled={busy === conn.id}
                  title="Test connection"
                  className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#374151] disabled:opacity-50"
                >
                  <TestTube2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(conn)}
                  disabled={busy === conn.id}
                  title="Delete"
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── New connector form (A2-style) ────────────────────────────────────────────

function NewConnectorForm({ onSaved, onError }: { onSaved: () => void; onError: (m: string) => void }) {
  const [type, setType] = useState<ConnectorTypeKey>('ADF');
  const [name, setName] = useState('');
  const [creds, setCreds] = useState<CredMap['ADF'] | CredMap['DATABRICKS'] | CredMap['GIT']>(EMPTY_CREDS.ADF);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const onTypeChange = (t: ConnectorTypeKey) => {
    setType(t);
    setCreds(EMPTY_CREDS[t] as any);
  };

  const updateCred = (k: string, v: string) => setCreds(c => ({ ...c, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      const opt = TYPE_OPTIONS.find(o => o.value === type)!;
      const { type: _t, ...config } = creds as any;
      await api.upsertConnector({ type_id: opt.typeId, name, config });
      // Auto-test
      setTesting(true);
      try {
        const r = await api.testConnector(opt.typeId);
        if (r.status === 'connected') {
          // success — handled silently, UI will refresh
        }
      } finally {
        setTesting(false);
      }
      onSaved();
    } catch (e: any) {
      onError(e.message || 'Creation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-5">
      {/* Type selector */}
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#6B7280] font-semibold mb-2">
          Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeChange(opt.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                type === opt.value
                  ? 'border-[#111827] bg-[#F9FAFB] shadow-sm ring-1 ring-[#111827]'
                  : 'border-[#E5E7EB] hover:border-[#9CA3AF] bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ConnectorIcon type={opt.value} size={14} />
                <span className="text-sm font-medium text-[#111827]">{opt.label}</span>
              </div>
              <div className="text-[10px] text-[#9CA3AF]">{opt.help}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#6B7280] font-semibold mb-1.5">
          Display name
        </label>
        <input
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
          placeholder="e.g. prod-adf-westeurope"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      {/* Credential fields */}
      {type === 'ADF' && <ADFForm creds={creds as CredMap['ADF']} update={updateCred} />}
      {type === 'DATABRICKS' && <DatabricksForm creds={creds as CredMap['DATABRICKS']} update={updateCred} />}
      {type === 'GIT' && <GitForm creds={creds as CredMap['GIT']} update={updateCred} />}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => onError('')}
          className="px-4 py-2 rounded-lg text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || testing}
          className="px-4 py-2 rounded-lg bg-[#111827] text-white text-sm font-medium hover:bg-black disabled:opacity-60 transition-colors"
        >
          {busy ? 'Saving…' : testing ? 'Testing…' : 'Connect & sync'}
        </button>
      </div>
    </form>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-[#6B7280] font-semibold mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#9CA3AF] mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:outline-none focus:border-[#111827]';

function ADFForm({ creds, update }: { creds: CredMap['ADF']; update: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
      <p className="text-[11px] text-[#6B7280]">
        <Workflow size={11} className="inline mr-1 text-sky-600" />
        Azure AD service principal — needs <strong>Data Factory Contributor</strong> on the target factory.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label="Tenant ID">
          <input className={inputCls} value={creds.tenant_id} onChange={e => update('tenant_id', e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Subscription ID">
          <input className={inputCls} value={creds.subscription_id} onChange={e => update('subscription_id', e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Client (App) ID">
          <input className={inputCls} value={creds.client_id} onChange={e => update('client_id', e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Client Secret">
          <input className={inputCls} type="password" value={creds.client_secret} onChange={e => update('client_secret', e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Resource Group">
          <input className={inputCls} value={creds.resource_group} onChange={e => update('resource_group', e.target.value)} required />
        </FieldGroup>
        <FieldGroup label="Factory Name">
          <input className={inputCls} value={creds.factory_name} onChange={e => update('factory_name', e.target.value)} required />
        </FieldGroup>
      </div>
    </div>
  );
}

function DatabricksForm({ creds, update }: { creds: CredMap['DATABRICKS']; update: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
      <p className="text-[11px] text-[#6B7280]">
        <Database size={11} className="inline mr-1 text-amber-600" />
        Generate a PAT in User Settings → Developer → Access Tokens.
      </p>
      <FieldGroup label="Workspace URL" hint="e.g. https://adb-1234567890.12.azuredatabricks.net">
        <input className={inputCls} value={creds.workspace_url} onChange={e => update('workspace_url', e.target.value)}
          placeholder="https://adb-xxx.azuredatabricks.net" required />
      </FieldGroup>
      <FieldGroup label="Personal Access Token">
        <input className={inputCls} type="password" value={creds.personal_access_token}
          onChange={e => update('personal_access_token', e.target.value)} required />
      </FieldGroup>
    </div>
  );
}

function GitForm({ creds, update }: { creds: CredMap['GIT']; update: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
      <p className="text-[11px] text-[#6B7280]">
        <GitBranch size={11} className="inline mr-1 text-violet-600" />
        GitHub PAT with <strong>repo</strong> + <strong>actions:read</strong> scopes.
      </p>
      <FieldGroup label="Provider">
        <select className={inputCls} value={creds.provider} onChange={e => update('provider', e.target.value)}>
          <option value="github">GitHub</option>
          <option value="gitlab" disabled>GitLab (coming soon)</option>
        </select>
      </FieldGroup>
      <FieldGroup label="Owner / Org">
        <input className={inputCls} value={creds.owner} onChange={e => update('owner', e.target.value)}
          placeholder="username or organization" required />
      </FieldGroup>
      <FieldGroup label="Repository (optional)" hint="Leave blank to sync all repos owner has access to">
        <input className={inputCls} value={creds.repo} onChange={e => update('repo', e.target.value)}
          placeholder="my-repo" />
      </FieldGroup>
      <FieldGroup label="Personal Access Token">
        <input className={inputCls} type="password" value={creds.token} onChange={e => update('token', e.target.value)} required />
      </FieldGroup>
    </div>
  );
}
