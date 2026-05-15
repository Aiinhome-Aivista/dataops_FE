/**
 * Incident Timeline page.
 *
 * Layout (matches the design mock):
 *
 *  ┌────────────────────┬────────────────────────────────────────────┐
 *  │  OPEN  ALL  CLOSED │                                            │
 *  │  ───────────────── │  STEP 1   Incident Detection      System   │
 *  │  search…           │  STEP 2   Initial Notification    Mailer   │
 *  │  N incidents       │  STEP 3   Escalation              System   │
 *  │  [card #1]         │                                            │
 *  │  [card #2]   ◄──── │  (renders for the selected incident)       │
 *  │  [card #3]         │                                            │
 *  └────────────────────┴────────────────────────────────────────────┘
 *
 * The card on the left shows only what the spec asks for:
 *   - pipeline / pipeline_id
 *   - one-line summary
 *   - created_at (formatted as "Xm ago")
 *
 * The three timeline steps on the right are entirely driven by the
 * incident row's new columns:
 *   - STEP 1 — always shown; uses `detected_at`
 *   - STEP 2 — shown if `initial_email_sent_at` is set
 *   - STEP 3 — shown if `escalation_email_sent_at` is set
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  ShieldAlert,
  Mail,
  AlertTriangle,
  Cpu,
  Check,
  X,
  Loader2,
  ChevronDown,
  ArrowDown,
} from "lucide-react";
import { motion } from "motion/react";
import { useStore } from "../hooks/useStore";
import { cn, formatDateTime, timeAgo } from "../lib/utils";
import type { Incident, EscalationRecipient } from "../types";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

type FilterTab = "open" | "all" | "closed";

const OPEN_STATUSES = new Set([
  "Detected",
  "Reasoning",
  "Planning",
  "Awaiting Approval",
  "Executing",
  "Evaluating",
]);

function isOpen(i: Incident): boolean {
  return OPEN_STATUSES.has(i.status);
}

function isClosed(i: Incident): boolean {
  return (
    i.status === "Remediated" ||
    i.status === "Escalated" ||
    i.status === "Failed"
  );
}

/** Pull the most useful one-line summary from whatever the backend filled in. */
function bestSummary(i: Incident): string {
  return (
    i.agent_thought ||
    i.proposed_action ||
    i.root_cause ||
    i.error_log?.split("\n")[0] ||
    "Awaiting diagnosis…"
  );
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export function IncidentsPage() {
  const { state, approveIncident, rejectIncident } = useStore();
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    routeId ?? null,
  );
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(
    null,
  );

  // Filtered list (memoised — recomputes only when filter/search/data change)
  const filtered = useMemo(() => {
    let list = [...(state.incidents || [])];
    if (filter === "open") list = list.filter(isOpen);
    if (filter === "closed") list = list.filter(isClosed);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.pipeline_name?.toLowerCase().includes(q) ||
          String(i.id).includes(q) ||
          bestSummary(i).toLowerCase().includes(q),
      );
    }

    // Newest first
    list.sort(
      (a, b) =>
        new Date(b.detected_at).getTime() -
        new Date(a.detected_at).getTime(),
    );
    return list;
  }, [state.incidents, filter, searchQuery]);

  // Auto-select first matching incident if nothing is selected (or the
  // current selection no longer matches the filter).
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = filtered.some(
      (i) => String(i.id) === String(selectedId),
    );
    if (!stillThere) setSelectedId(String(filtered[0].id));
  }, [filtered, selectedId]);

  // Keep the URL in sync with the selection
  useEffect(() => {
    if (selectedId && routeId !== selectedId) {
      navigate(`/app/incidents/${selectedId}`, { replace: true });
    }
  }, [selectedId, routeId, navigate]);

  const selected = useMemo(
    () =>
      (state.incidents || []).find((i) => String(i.id) === String(selectedId)) ||
      null,
    [state.incidents, selectedId],
  );

  // Action handlers
  const handleApprove = async () => {
    if (!selected) return;
    setBusyAction("approve");
    try {
      await approveIncident(String(selected.id));
    } finally {
      setBusyAction(null);
    }
  };
  const handleReject = async () => {
    if (!selected) return;
    setBusyAction("reject");
    try {
      await rejectIncident(String(selected.id));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 bg-[#F9FAFB]">
      {/* ─── LEFT: filter + incident list ───────────────────────────── */}
      <aside className="w-[340px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col">
        {/* Filter pills */}
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="bg-[#F3F4F6] p-1 rounded-lg flex">
            {(["open", "all", "closed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  filter === tab
                    ? "bg-[#111827] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search incidents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mt-3">
            {filtered.length} INCIDENT{filtered.length === 1 ? "" : "S"}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9CA3AF]">
              No incidents match this filter.
            </div>
          ) : (
            <ul className="divide-y divide-[#F3F4F6]">
              {filtered.map((inc) => {
                const active = String(inc.id) === String(selectedId);
                const summary = bestSummary(inc);
                return (
                  <li key={inc.id}>
                    <button
                      onClick={() => setSelectedId(String(inc.id))}
                      className={cn(
                        "w-full text-left p-4 transition-colors relative",
                        active
                          ? "bg-[#F3F4F6]"
                          : "hover:bg-[#F9FAFB]",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#111827]" />
                      )}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-[#6B7280]">
                          #{inc.id}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            inc.risk_tier === "High"
                              ? "bg-rose-50 text-rose-700"
                              : inc.risk_tier === "Medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {inc.risk_tier}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-[#111827] truncate">
                        {inc.pipeline_name}
                      </div>
                      <div className="text-[11px] text-[#6B7280] mt-1 leading-relaxed line-clamp-2">
                        {summary}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                            inc.status === "Remediated"
                              ? "bg-emerald-50 text-emerald-700"
                              : inc.status === "Escalated"
                                ? "bg-rose-50 text-rose-700"
                                : inc.status === "Failed"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-blue-50 text-blue-700",
                          )}
                        >
                          {inc.status}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] font-medium">
                          {timeAgo(inc.detected_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ─── RIGHT: timeline pane ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">
            Select an incident on the left to inspect its timeline.
          </div>
        ) : (
          <TimelineView
            incident={selected}
            onApprove={handleApprove}
            onReject={handleReject}
            busyAction={busyAction}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Right-pane: the three-step timeline
// ─────────────────────────────────────────────────────────────────────

interface TimelineViewProps {
  incident: Incident;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  busyAction: "approve" | "reject" | null;
}

function TimelineView({
  incident,
  onApprove,
  onReject,
  busyAction,
}: TimelineViewProps) {
  const summary = bestSummary(incident);
  const showApproval = incident.status === "Awaiting Approval";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header strip */}
      <div className="mb-6 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {incident.pipeline_name}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#6B7280]">
              <span>Incident #{incident.id}</span>
              <span>·</span>
              <span>{formatDateTime(incident.detected_at)}</span>
              <span>·</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                  incident.status === "Remediated"
                    ? "bg-emerald-100 text-emerald-700"
                    : incident.status === "Escalated"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700",
                )}
              >
                {incident.status}
              </span>
            </div>
          </div>
          {showApproval && (
            <div className="flex gap-2">
              <button
                onClick={onReject}
                disabled={busyAction !== null}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#6B7280] hover:text-rose-600 border border-[#E5E7EB] hover:border-rose-200 rounded-lg disabled:opacity-50 transition-colors"
              >
                {busyAction === "reject" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Reject"
                )}
              </button>
              <button
                onClick={onApprove}
                disabled={busyAction !== null}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#111827] hover:bg-black text-white rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {busyAction === "approve" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Approve"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* The three steps */}
      <div className="relative">
        <Step
          index={1}
          title="Incident Detection"
          source={{ kind: "System", icon: Cpu }}
          time={incident.detected_at}
          tone="default"
        >
          <Line label="Issue Summary" value={summary} />
          <Line
            label="Detection Time"
            value={formatDateTime(incident.detected_at)}
          />
          <Line
            label="Pipeline ID"
            value={
              incident.pipeline_id
                ? incident.pipeline_id
                : `#${incident.id}`
            }
          />
          <Line
            label="Context"
            value={`Severity ${incident.risk_tier}`}
          />
        </Step>

        {/* Connecting line drawn through `Step` itself */}
        <ConnectorLine />

        {/* STEP 2 — only if initial mail was actually sent */}
        {incident.initial_email_sent_at ? (
          <>
            <Step
              index={2}
              title="Initial Notification"
              source={{ kind: "Mailer", icon: Mail }}
              time={incident.initial_email_sent_at}
              tone="default"
            >
              <p className="text-xs text-[#6B7280] leading-relaxed">
                1st notification sent by mail to{" "}
                <b className="text-[#111827]">
                  {incident.initial_email_role || "DataOps"}
                </b>{" "}
                &lt;
                <span className="font-mono text-[11px] text-[#374151]">
                  {incident.initial_email_recipient}
                </span>
                &gt; with possible solution.
              </p>
              <p className="text-[10px] text-[#9CA3AF] mt-1.5 font-mono">
                Sent at {formatDateTime(incident.initial_email_sent_at)}
              </p>
            </Step>
            <ConnectorLine />
          </>
        ) : (
          <>
            <PlaceholderStep
              index={2}
              title="Initial Notification"
              note={
                incident.status === "Detected" ||
                incident.status === "Reasoning"
                  ? "Pending — Mistral diagnosis must complete before mail goes out."
                  : "No initial email was sent (SMTP may not be configured)."
              }
            />
            <ConnectorLine muted />
          </>
        )}

        {/* STEP 3 — only if escalation fired */}
        {incident.escalation_email_sent_at ? (
          <>
            <Step
              index={3}
              title="Escalation"
              source={{ kind: "System", icon: AlertTriangle }}
              time={incident.escalation_email_sent_at}
              tone="alert"
            >
              <Line label="Issue summary" value={summary} />
              <Line
                label="Detection time"
                value={formatDateTime(incident.detected_at)}
              />
              <Line
                label="Pipeline ID"
                value={incident.pipeline_id || `#${incident.id}`}
              />
              <p className="text-xs text-[#6B7280] leading-relaxed mt-2">
                Earlier mail sent on{" "}
                <span className="font-mono text-[11px]">
                  {formatDateTime(incident.initial_email_sent_at)}
                </span>{" "}
                to{" "}
                <b className="text-[#111827]">
                  {incident.initial_email_recipient?.split("@")[0] ||
                    incident.initial_email_role ||
                    "DataOps"}
                </b>{" "}
                need immediate attention with{" "}
                <b className="text-[#111827]">solution</b> and mail sent to{" "}
                <b className="text-[#111827]">
                  {(incident.escalation_email_recipients || [])
                    .map((r) => r.role)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(", ") || "senior data engineer"}
                </b>
                .
              </p>
              {!!incident.escalation_email_recipients?.length && (
                <EscalationList
                  recipients={incident.escalation_email_recipients}
                />
              )}
              <p className="text-[10px] text-[#9CA3AF] mt-2 font-mono">
                Escalated at{" "}
                {formatDateTime(incident.escalation_email_sent_at)}
              </p>
            </Step>
            {incident.resolved_at && <ConnectorLine />}
          </>
        ) : (
          incident.status !== "Remediated" &&
          !incident.resolved_at && (
            <>
              <PlaceholderStep
                index={3}
                title="Escalation"
                note={
                  incident.initial_email_sent_at
                    ? `Will fire automatically if no action by ${escalationWindow()} after the initial email.`
                    : "Will fire once the initial mail has been sent and the SLA window expires."
                }
              />
              {incident.resolved_at && <ConnectorLine muted />}
            </>
          )
        )}

        {/* STEP 4/3 — Resolved */}
        {incident.resolved_at && (
          <Step
            index={incident.escalation_email_sent_at ? 4 : 3}
            title="Issue Resolved"
            source={{ kind: "System", icon: Check }}
            time={incident.resolved_at}
            tone="default"
          >
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Issue was resolved at{" "}
              <span className="font-mono text-[11px] font-bold text-[#111827]">
                {formatDateTime(incident.resolved_at)}
              </span>
              .
            </p>
          </Step>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

interface StepProps {
  index: number;
  title: string;
  time?: string | null;
  source: { kind: string; icon: any };
  tone: "default" | "alert";
  children: React.ReactNode;
}

function Step({ index, title, time, source, tone, children }: StepProps) {
  const Icon = source.icon;
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative bg-white border rounded-2xl p-5 shadow-sm",
        tone === "alert"
          ? "border-rose-200 bg-rose-50/30"
          : "border-[#E5E7EB]",
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
            Step {index}
          </div>
          <h3 className="text-base font-bold text-[#111827] mt-1">
            {title}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
            source.kind === "Mailer"
              ? "bg-blue-50 text-blue-700"
              : tone === "alert"
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700",
          )}
        >
          <Icon className="w-3 h-3" /> {source.kind}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </motion.section>
  );
}

function PlaceholderStep({
  index,
  title,
  note,
}: {
  index: number;
  title: string;
  note: string;
}) {
  return (
    <section className="relative bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">
            Step {index}
          </div>
          <h3 className="text-sm font-bold text-[#9CA3AF] mt-1">
            {title}
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] bg-[#F3F4F6] px-2 py-1 rounded-md">
          Pending
        </span>
      </div>
      <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">{note}</p>
    </section>
  );
}

function ConnectorLine({ muted = false }: { muted?: boolean }) {
  return (
    <div className="flex justify-center py-1.5">
      <ArrowDown
        size={24}
        strokeWidth={3}
        className={cn(muted ? "text-[#D1D5DB]" : "text-[#9CA3AF]")}
      />
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs text-[#374151] leading-relaxed">
      <span className="text-[#6B7280]">{label}:</span>{" "}
      <span className="text-[#111827]">{value}</span>
    </div>
  );
}

function EscalationList({
  recipients,
}: {
  recipients: EscalationRecipient[];
}) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {recipients.map((r, i) => (
        <div
          key={`${r.email}-${i}`}
          className="border border-[#E5E7EB] bg-white rounded-md px-2.5 py-1.5"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            {r.role}
          </div>
          <div className="text-[11px] font-mono text-[#111827] truncate">
            {r.email}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Just a label — the actual window is configured server-side. */
function escalationWindow(): string {
  return "the SLA window";
}
