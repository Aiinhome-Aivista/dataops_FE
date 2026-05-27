import { useCallback, useEffect, useState } from "react";
import { llmApi, type LLMMode, type LLMHealthBoth } from "../services/graphApi";

export function LLMModeSwitch() {
  const [health, setHealth] = useState<LLMHealthBoth | null>(null);
  const [busy, setBusy]     = useState<LLMMode | null>(null);
  const [err, setErr]       = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setHealth(await llmApi.healthBoth());
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  const flip = async (target: LLMMode) => {
    if (!health || health.active_mode === target || busy) return;
    setBusy(target);
    try {
      await llmApi.setMode(target);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!health) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200
                      bg-zinc-50 px-3 py-1 text-xs text-zinc-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
        LLM…
      </div>
    );
  }

  const active   = health.active_mode;
  const cloudOk  = health.Cloud.ok;
  const localOk  = health.Local.ok;
  const activeModel = active === "Cloud" ? health.Cloud.model : health.Local.model;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200
                    bg-zinc-50 p-0.5 text-xs select-none shadow-xs">
      <SidePill
        label="Cloud"
        active={active === "Cloud"}
        ok={cloudOk}
        busy={busy === "Cloud"}
        title={cloudOk
          ? `Cloud OK · ${health.Cloud.model}`
          : `Cloud unreachable: ${health.Cloud.error ?? "unknown"}`}
        onClick={() => flip("Cloud")}
      />
      <SidePill
        label="Local"
        active={active === "Local"}
        ok={localOk}
        busy={busy === "Local"}
        title={localOk
          ? `Local OK · ${health.Local.model} @ ${health.Local.endpoint ?? "?"}`
          : `Local unreachable: ${health.Local.error ?? "unknown"}`}
        onClick={() => flip("Local")}
      />
      <span className="ml-2 mr-3 text-zinc-500 font-mono text-[10px]"
            title={`Active model: ${activeModel}`}>
        {activeModel}
      </span>
      {err && (
        <span className="ml-1 mr-2 text-red-500 text-[10px] font-bold animate-pulse" title={err}>!</span>
      )}
    </div>
  );
}

function SidePill({
  label, active, ok, busy, onClick, title,
}: {
  label: LLMMode;
  active: boolean;
  ok: boolean;
  busy: boolean;
  onClick: () => void;
  title: string;
}) {
  const base = "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200";
  const cls  = active
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400/30 cursor-default font-semibold"
    : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50 cursor-pointer";
  return (
    <button
      type="button"
      onClick={active ? undefined : onClick}
      disabled={busy || active}
      title={title}
      className={`${base} ${cls} ${busy ? "opacity-50 animate-pulse" : ""}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok ? "bg-emerald-400 animate-pulse" : "bg-red-400"
        }`}
      />
      <span className="tracking-wide">{label}</span>
    </button>
  );
}
