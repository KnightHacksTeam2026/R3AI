import GlassPanel from "./GlassPanel";
import { distanceM, formatDistance } from "./routeGeometry";
import type { Coordinate, RobotState } from "./types";

export default function RobotPanel({ bots, mapCenter, selectedId, onSelect }: {
  bots: RobotState[]; mapCenter: Coordinate; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const nearby = bots.map(bot => ({ bot, distance: distanceM(mapCenter, [bot.longitude, bot.latitude]) }))
    .sort((a, b) => a.distance - b.distance);
  return <GlassPanel className="p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between"><div><p className="command-kicker">Simulated fleet</p><h2 className="mt-1 font-semibold">R3 BOTS</h2></div><span className="text-xs text-[var(--cmd-muted)]">{bots.length} units</span></div>
    <p className="mb-3 text-[11px] text-[var(--cmd-muted)]">Nearest first · straight-line distance from map center</p>
    <div className="space-y-2">{nearby.map(({ bot, distance }) =>
      <button key={bot.id} type="button" aria-pressed={selectedId === bot.id} onClick={() => onSelect(bot.id)} className={`command-fleet-row flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedId === bot.id ? "border-[var(--cmd-accent)] bg-[var(--cmd-accent)]/10" : "border-[var(--cmd-border)] bg-[var(--cmd-soft)] hover:bg-[var(--cmd-hover)]"}`}>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{bot.id}</p><p className="mt-1 text-[10px] capitalize text-[var(--cmd-muted)]">{bot.type} · {bot.area} · {bot.status.replace("-", " ")}</p></div>
        <span className="shrink-0 text-right text-[11px] tabular-nums text-[var(--cmd-muted)]">{formatDistance(distance)}<span className="mt-1 block" aria-label={`Simulated battery ${Math.round(bot.batteryPct)} percent`}>{Math.round(bot.batteryPct)}% battery</span></span>
      </button>
    )}</div>
    <p className="mt-3 text-[10px] text-[var(--cmd-muted)]">Pan the globe to discover other test regions.</p>
  </GlassPanel>;
}
