import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Cloud,
  History,
  Layers,
  MessageSquare,
  Monitor,
  ShieldAlert,
  X,
  ChevronLeft,
  Plus,
  TestTube2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { mapConnector } from '../services/adapters';
import type { Connector, ConnectorDetail, ConnectorType } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  connectors: Connector[];
  onChange: () => void;
}

const ICONS: Record<string, typeof Activity> = {
  layers: Layers,
  cloud: Cloud,
  activity: Activity,
  message: MessageSquare,
  shield: ShieldAlert,
  history: History,
  monitor: Monitor,
};

function iconFor(hint?: string) {
  if (!hint) return Monitor;
  return ICONS[hint] || Monitor;
}

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-emerald-500',
  error: 'bg-red-500',
  not_configured: 'bg-[#9CA3AF]',
  pending: 'bg-amber-500',
};

// Built-in connector catalog (used when backend doesn't provide types)
const DEFAULT_CONNECTOR_TYPES: ConnectorType[] = [
  {
    type_id: 'ADF',
    name: 'Azure Data Factory',
    category: 'ETL',
    description: 'Azure Data Factory — service principal credentials',
    icon_hint: 'cloud',
    fields: [
      { name: 'tenant_id', label: 'Tenant ID', kind: 'text', required: true },
      { name: 'client_id', label: 'Client ID', kind: 'text', required: true },
      { name: 'client_secret', label: 'Client secret', kind: 'password', secret: true },
      { name: 'subscription_id', label: 'Subscription ID', kind: 'text' },
      { name: 'resource_group', label: 'Resource group', kind: 'text' },
      { name: 'factory_name', label: 'Factory name', kind: 'text' },
    ],
  },
  {
    type_id: 'DATABRICKS',
    name: 'Databricks',
    category: 'ETL',
    description: 'Databricks workspace — personal access token',
    icon_hint: 'cloud',
    fields: [
      { name: 'workspace_url', label: 'Workspace URL', kind: 'url', required: true },
      { name: 'personal_access_token', label: 'Personal access token', kind: 'password', secret: true },
    ],
  },
  {
    type_id: 'GIT',
    name: 'GitHub Actions',
    category: 'VCS',
    description: 'GitHub Actions — Personal Access Token',
    icon_hint: 'message',
    fields: [
      { name: 'provider', label: 'Provider', kind: 'select', options: ['github', 'gitlab'], default: 'github' },
      { name: 'token', label: 'Personal Access Token', kind: 'password', secret: true },
      { name: 'owner', label: 'Owner / Org', kind: 'text' },
      { name: 'repo', label: 'Repository', kind: 'text' },
    ],
  },
  {
    type_id: 'postgres',
    name: 'Postgres',
    category: 'Databases',
    description: 'Connect to Postgres databases',
    icon_hint: 'layers',
    fields: [
      { name: 'host', label: 'Host', kind: 'text', required: true },
      { name: 'port', label: 'Port', kind: 'text', default: '5432' },
      { name: 'database', label: 'Database', kind: 'text' },
      { name: 'user', label: 'User', kind: 'text' },
      { name: 'password', label: 'Password', kind: 'password', secret: true },
    ],
  },
  {
    type_id: 'mysql',
    name: 'MySQL',
    category: 'Databases',
    description: 'Connect to MySQL or MariaDB',
    icon_hint: 'layers',
    fields: [
      { name: 'host', label: 'Host', kind: 'text', required: true },
      { name: 'port', label: 'Port', kind: 'text', default: '3306' },
      { name: 'database', label: 'Database', kind: 'text' },
      { name: 'user', label: 'User', kind: 'text' },
      { name: 'password', label: 'Password', kind: 'password', secret: true },
    ],
  },
  {
    type_id: 's3',
    name: 'S3',
    category: 'Storage',
    description: 'Amazon S3 / S3-compatible object storage',
    icon_hint: 'cloud',
    fields: [
      { name: 'bucket', label: 'Bucket', kind: 'text', required: true },
      { name: 'region', label: 'Region', kind: 'text' },
      { name: 'access_key', label: 'Access key', kind: 'text', secret: true },
      { name: 'secret_key', label: 'Secret key', kind: 'password', secret: true },
    ],
  },
  {
    type_id: 'slack',
    name: 'Slack',
    category: 'Messaging',
    description: 'Post notifications to Slack',
    icon_hint: 'message',
    fields: [
      { name: 'webhook', label: 'Webhook URL', kind: 'url', required: true, secret: true },
    ],
  },
  {
    type_id: 'http',
    name: 'HTTP',
    category: 'Integration',
    description: 'Generic HTTP webhook/ingest',
    icon_hint: 'activity',
    fields: [{ name: 'url', label: 'URL', kind: 'url', required: true }],
  },
];

type View =
  | { kind: 'list' }
  | { kind: 'pickType' }
  | { kind: 'form'; typeId: string; existingId?: string };

export function ConnectorModal({ open, onClose, connectors, onChange }: Props) {
  const [types, setTypes] = useState<ConnectorType[]>([]);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [detail, setDetail] = useState<ConnectorDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { status: string; detail: string }>>({});

  // Load types whenever the modal opens
  useEffect(() => {
    if (!open) return;
    api.connectorTypes().then(setTypes).catch(() => setTypes([]));
    setView({ kind: 'list' });
  }, [open]);

  const typeMap = useMemo(() => {
    const m: Record<string, ConnectorType> = {};
    for (const t of types) m[t.type_id] = t;
    return m;
  }, [types]);

  const openAdd = () => {
    setErr(null);
    setView({ kind: 'pickType' });
  };

  const pickType = async (typeId: string) => {
    setErr(null);
    setView({ kind: 'form', typeId });
    setDetail(null);
  };

  const openEdit = async (c: Connector) => {
    setErr(null);
    setBusy(c.id);
    try {
      const d = await api.getConnector(c.id);
      const mapped = mapConnector(d);
      setDetail(mapped);
      setView({ kind: 'form', typeId: mapped.type_id, existingId: mapped.id });
    } catch (e: any) {
      setErr(e.message || 'failed to load connector');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (c: Connector) => {
    setBusy(c.id);
    try {
      await api.deleteConnector(c.id);
      onChange();
    } catch (e: any) {
      setErr(e.message || 'delete failed');
    } finally {
      setBusy(null);
    }
  };

  const test = async (c: Connector) => {
    setBusy(c.id);
    try {
      const r = await api.testConnector(c.id);
      setTestResults((s) => ({ ...s, [c.id]: r }));
      onChange();
    } catch (e: any) {
      setTestResults((s) => ({ ...s, [c.id]: { status: 'error', detail: e.message } }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-2xl border border-[#E5E7EB] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3 min-w-0">
                {view.kind !== 'list' && (
                  <button
                    onClick={() => setView({ kind: 'list' })}
                    className="text-[#6B7280] hover:text-[#111827]"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#111827]">
                    {view.kind === 'list' && 'Connectors'}
                    {view.kind === 'pickType' && 'Add a connector'}
                    {view.kind === 'form' &&
                      (view.existingId
                        ? `Edit ${typeMap[view.typeId]?.name ?? view.typeId}`
                        : `Configure ${typeMap[view.typeId]?.name ?? view.typeId}`)}
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                    {view.kind === 'list' && 'Add, edit, test, or remove integrations.'}
                    {view.kind === 'pickType' && 'Pick a type to configure.'}
                    {view.kind === 'form' && 'Secrets are encrypted at rest.'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#9CA3AF] hover:text-[#111827] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {err && (
                <div className="mx-6 mt-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                  {err}
                </div>
              )}

              {view.kind === 'list' && (
                <ListView
                  connectors={connectors}
                  typeMap={typeMap}
                  busy={busy}
                  testResults={testResults}
                  onAdd={openAdd}
                  onEdit={openEdit}
                  onTest={test}
                  onDelete={remove}
                />
              )}

              {view.kind === 'pickType' && (
                <PickTypeView types={types} connectors={connectors} onPick={pickType} />
              )}

              {view.kind === 'form' && (
                <ConnectorForm
                  typeId={view.typeId}
                  spec={typeMap[view.typeId]}
                  initialDetail={detail}
                  onSaved={() => {
                    onChange();
                    setView({ kind: 'list' });
                  }}
                  onError={(m) => setErr(m)}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- List view ----------

function ListView(props: {
  connectors: Connector[];
  typeMap: Record<string, ConnectorType>;
  busy: string | null;
  testResults: Record<string, { status: string; detail: string }>;
  onAdd: () => void;
  onEdit: (c: Connector) => void;
  onTest: (c: Connector) => void;
  onDelete: (c: Connector) => void;
}) {
  const { connectors, typeMap, busy, testResults, onAdd, onEdit, onTest, onDelete } = props;
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
        {connectors.map((conn) => {
          const typeId = (conn as Connector & { type_id?: string }).type_id ?? conn.id;
          const spec = typeMap[typeId];
          const Ic = iconFor(spec?.icon_hint);
          const dot = STATUS_DOT[conn.status] || 'bg-[#9CA3AF]';
          const tr = testResults[conn.id];
          return (
            <div
              key={conn.id}
              className="flex items-start justify-between gap-3 px-4 py-3 border border-[#E5E7EB] rounded-lg bg-white"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                  <Ic className="w-4 h-4 text-[#374151]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{conn.name}</p>
                  <p className="text-[11px] text-[#6B7280] truncate">
                    {conn.type}
                    {conn.description ? ` · ${conn.description}` : ''}
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
                  onClick={() => onTest(conn)}
                  disabled={busy === conn.id}
                  title="Test connection"
                  className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#374151] disabled:opacity-50"
                >
                  <TestTube2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEdit(conn)}
                  disabled={busy === conn.id}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#111827] disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(conn)}
                  disabled={busy === conn.id}
                  title="Delete"
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-50"
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

// ---------- Pick type view ----------

function PickTypeView(props: {
  types: ConnectorType[];
  connectors: Connector[];
  onPick: (typeId: string) => void;
}) {
  const { types, connectors, onPick } = props;
  const existingTypeIds = new Set(connectors.map((c) => String((c as any).type_id ?? c.id)));

  // Merge backend types with defaults (avoid duplicates)
  const mergedTypes: ConnectorType[] = [];
  const seen = new Set<string>();
  for (const t of [...types, ...DEFAULT_CONNECTOR_TYPES]) {
    if (seen.has(t.type_id)) continue;
    seen.add(t.type_id);
    mergedTypes.push(t);
  }

  // Group by category
  const groups: Record<string, ConnectorType[]> = {};
  for (const t of mergedTypes) {
    (groups[t.category] = groups[t.category] || []).push(t);
  }

  return (
    <div className="p-6 space-y-6">
      {types.length === 0 && (
        <div className="mx-1 px-3 py-2 rounded-md bg-amber-50 border border-amber-100 text-amber-800 text-sm">
          Connector type catalog unavailable — showing common connector templates.
        </div>
      )}
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="text-[10px] uppercase font-black tracking-[0.18em] text-[#9CA3AF] mb-2">
            {cat}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {items.map((t) => {
              const Ic = iconFor(t.icon_hint);
              const already = existingTypeIds.has(t.type_id);
              return (
                <button
                  key={t.type_id}
                  onClick={() => onPick(t.type_id)}
                  className="flex items-start gap-3 px-4 py-3 border border-[#E5E7EB] rounded-lg bg-white hover:border-[#111827] text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                    <Ic className="w-4 h-4 text-[#374151]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111827] truncate">{t.name}</p>
                    <p className="text-[11px] text-[#6B7280] line-clamp-2">{t.description}</p>
                    {already && (
                      <p className="text-[10px] text-amber-700 mt-1">already configured — will update</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Form view ----------

function ConnectorForm(props: {
  typeId?: string;
  spec?: ConnectorType;
  initialDetail: ConnectorDetail | null;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const { typeId, spec, initialDetail, onSaved, onError } = props;
  const [values, setValues] = useState<Record<string, any>>({});
  const [name, setName] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; detail: string } | null>(null);

  // prefer backend spec, fall back to built-in defaults by typeId
  const effectiveSpec = spec ?? DEFAULT_CONNECTOR_TYPES.find((t) => t.type_id === typeId);

  const fields = effectiveSpec?.fields ?? [];

  useEffect(() => {
    if (!effectiveSpec) return;
    const initial: Record<string, any> = {};
    for (const f of fields) {
      if (initialDetail?.config && Object.prototype.hasOwnProperty.call(initialDetail.config, f.name)) {
        initial[f.name] = initialDetail.config[f.name];
      } else if (f.default !== undefined) {
        initial[f.name] = f.default;
      } else {
        initial[f.name] = '';
      }
    }
    setValues(initial);
    setName(initialDetail?.name || effectiveSpec.name);
  }, [effectiveSpec, initialDetail, fields]);

  if (!effectiveSpec) return <div className="p-6 text-sm text-[#6B7280]">Loading…</div>;

  const setField = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setSaving(true);
    onError('');
    try {
      // Strip the redaction sentinel before sending — the backend treats
      // it as "preserve previous value". But if the user types over it,
      // they overwrite normally.
      if (!effectiveSpec) {
        onError('connector type unavailable');
        return;
      }
      const cleaned: Record<string, any> = {};
      for (const f of fields) {
        const v = values[f.name];
        if (f.secret && (v === '********' || v === '')) {
          continue; // omit -> preserve existing
        }
        if (v !== undefined && v !== null) cleaned[f.name] = v;
      }
      await api.upsertConnector({ type_id: effectiveSpec.type_id, name, config: cleaned });
      onSaved();
    } catch (e: any) {
      onError(e.message || 'save failed');
    } finally {
      setSaving(false);
    }
  };

  const testNow = async () => {
    // Save first, then test (test endpoint reads from DB)
    setTesting(true);
    setTestResult(null);
    try {
      if (!effectiveSpec) {
        setTestResult({ status: 'error', detail: 'connector type unavailable' });
        return;
      }
      const cleaned: Record<string, any> = {};
      for (const f of fields) {
        const v = values[f.name];
        if (f.secret && (v === '********' || v === '')) continue;
        if (v !== undefined && v !== null) cleaned[f.name] = v;
      }
      const created = await api.upsertConnector({ type_id: effectiveSpec.type_id, name, config: cleaned });
      const r = await api.testConnector(String(created.id ?? created.type_id ?? effectiveSpec.type_id));
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ status: 'error', detail: e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div>
        <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">
          Display name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
        />
      </div>

      {fields.map((f) => (
        <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setField(f.name, v)} />
      ))}

      {testResult && (
        <div
          className={`px-3 py-2 rounded-md text-xs ${
            testResult.status === 'connected'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <strong className="capitalize">{testResult.status.replace('_', ' ')}</strong>
          {testResult.detail ? ` — ${testResult.detail}` : ''}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={submit}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-[#111827] text-white text-sm font-medium hover:bg-black disabled:opacity-50"
        >
          {saving ? 'Saving…' : initialDetail ? 'Save changes' : 'Save'}
        </button>
        <button
          onClick={testNow}
          disabled={testing || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm hover:bg-[#F9FAFB] text-[#111827] disabled:opacity-50"
        >
          <TestTube2 className="w-3.5 h-3.5" />
          {testing ? 'Testing…' : 'Save & test'}
        </button>
      </div>
    </div>
  );
}

function FieldInput(props: {
  field: ConnectorType['fields'][number];
  value: any;
  onChange: (v: any) => void;
}) {
  const { field, value, onChange } = props;
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-[#6B7280] mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.kind === 'select' ? (
        <select
          value={value ?? field.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
        >
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.kind === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] font-mono focus:outline-none focus:border-[#111827]"
        />
      ) : (
        <input
          type={field.kind === 'password' ? 'password' : field.kind === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#111827] focus:outline-none focus:border-[#111827]"
        />
      )}
      {field.help && <p className="text-[11px] text-[#9CA3AF] mt-1">{field.help}</p>}
    </div>
  );
}
