import GlassPanel from "./GlassPanel";
import { botsForPlace, type PlaceResult } from "./placeSearch";
import type { RobotState, WasteObservation } from "./types";

export default function PlacePanel({ place, bots, observations, onBot, onClose }: {
  place: PlaceResult; bots: RobotState[]; observations: WasteObservation[]; onBot: (id: string) => void; onClose: () => void;
}) {
  const relevant = botsForPlace(place, bots);
  const ids = new Set(relevant.map(bot => bot.id));
  const waste = observations.filter(item => ids.has(item.botId) && item.discovered);
  const collected = waste.filter(item => item.status === "collected").reduce((sum, item) => sum + item.massKg, 0);
  const remaining = waste.filter(item => item.status !== "collected").reduce((sum, item) => sum + item.massKg, 0);
  return <GlassPanel className="p-4 sm:p-5">
    <div className="flex items-start justify-between gap-2"><div><p className="command-kicker">Place overview · {place.kind}</p><h2 className="mt-2 text-lg font-semibold">{place.name}</h2></div><button type="button" onClick={onClose} aria-label="Close place overview and return to selected bot" className="command-map-button shrink-0 rounded-xl">×</button></div>
    <p className="mt-1 text-xs text-[var(--cmd-muted)]">{place.description || place.name}</p>
    <p className="mt-3 text-xs text-[var(--cmd-muted)]">{place.kind === "country" ? "Demo fleet assigned to this country" : "Demo fleet within 50 km of the place center"}</p>
    <dl className="my-4 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-[var(--cmd-muted)]">Bots</dt><dd className="mt-1 text-lg font-semibold">{relevant.length}</dd></div><div><dt className="text-[var(--cmd-muted)]">Cleaned kg</dt><dd className="mt-1 text-lg font-semibold">{collected.toFixed(2)}</dd></div><div><dt className="text-[var(--cmd-muted)]">Remaining kg</dt><dd className="mt-1 text-lg font-semibold">{remaining.toFixed(2)}</dd></div></dl>
    {!relevant.length && <p className="rounded-xl bg-[var(--cmd-soft)] p-3 text-xs leading-relaxed">No simulated missions here. This does not indicate an absence of real-world waste.</p>}
    {relevant.map(bot => <button key={bot.id} type="button" onClick={() => onBot(bot.id)} className="mt-2 w-full rounded-xl border border-[var(--cmd-border)] p-3 text-left hover:bg-[var(--cmd-hover)]"><span className="block text-xs font-semibold">{bot.id} · {bot.area}</span><span className="mt-1 block text-xs text-[var(--cmd-muted)]">{bot.status} · {Math.round(bot.batteryPct)}% battery · View mission →</span></button>)}
    <p className="mt-4 text-[10px] leading-relaxed text-[var(--cmd-muted)]">All cleanup totals and robot activity are synthetic. Place lookup does not add new observations. Choose a robot to show its coverage and route.</p>
  </GlassPanel>;
}
