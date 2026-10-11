export default function TelemetryPanel({ lastUpdate, runningCount }: { lastUpdate: string | null; runningCount: number }) {
  const description = `No satellite connection · Local simulation · ${runningCount} running${lastUpdate ? ` · Updated ${lastUpdate}` : ""}`;
  return <span tabIndex={0} aria-label={description} title={description} className="group relative flex h-11 w-8 shrink-0 items-center justify-center rounded-lg">
    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-400/10" />
    <span aria-hidden="true" className="pointer-events-none absolute bottom-full left-0 mb-3 hidden w-56 rounded-xl border border-[var(--cmd-border)] bg-[var(--cmd-panel-solid)] p-3 text-[11px] leading-relaxed text-[var(--cmd-muted)] shadow-lg group-hover:block group-focus-visible:block">{description}</span>
  </span>;
}
