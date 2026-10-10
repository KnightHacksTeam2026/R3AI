import GlassPanel from "./GlassPanel";

export default function TelemetryPanel({ lastUpdate, runningCount, onPauseAll }: { lastUpdate: string | null; runningCount: number; onPauseAll: () => void }) {
  return <GlassPanel className="px-4 py-3">
    <div className="flex items-center gap-3">
      <span className={`h-2 w-2 rounded-full ${runningCount ? "bg-[var(--cmd-accent)]" : "bg-amber-400"}`} />
      <p className="text-xs font-medium">Local simulation · {runningCount ? `${runningCount} running` : "idle"}</p>
      {runningCount > 0 && <button type="button" onClick={onPauseAll} className="min-h-11 text-xs font-semibold text-[var(--cmd-accent)] underline underline-offset-4">Pause all</button>}
    </div>
    <p className="mt-1 text-[10px] text-[var(--cmd-muted)]">No satellite connection{lastUpdate ? ` · Updated ${lastUpdate}` : " · Synthetic demo data"}</p>
  </GlassPanel>;
}
