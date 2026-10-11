import GlassPanel from "./GlassPanel";
import type { WasteObservation } from "./types";

export default function ObservationsPanel({ observations, area, botId, visible, onShow }: {
  observations: WasteObservation[]; area: string; botId: string; visible: boolean; onShow: () => void;
}) {
  const discovered = observations.filter(item => item.discovered);
  const categories = [...new Set(discovered.map(item => item.category))].map(category => {
    const items = discovered.filter(item => item.category === category);
    return { category, mappedKg: items.reduce((sum, item) => sum + item.massKg, 0), cleanedKg: items.filter(item => item.status === "collected").reduce((sum, item) => sum + item.massKg, 0) };
  });
  return <GlassPanel className="p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><div><p className="command-kicker">Selected bot coverage</p><h2 className="mt-1 font-semibold">{area} cleanup</h2></div><span className="rounded-full bg-[var(--cmd-soft)] px-2 py-1 text-[10px]">{discovered.some(item => item.source === "ai-inference") ? "R3-YOLO" : "SYNTHETIC"}</span></div>
    <p className="mb-3 text-xs text-[var(--cmd-muted)]">{botId} · {visible ? "Coverage shown for this bot only." : "Coverage layer is hidden."}</p>
    {!visible && <button type="button" onClick={onShow} className="command-secondary-button mb-3 w-full text-xs">Show cleanup coverage</button>}
    <div className="mb-4 space-y-2 rounded-xl border border-[var(--cmd-border)] bg-[var(--cmd-soft)] p-3 text-xs">
      <p><i className="command-legend-dot waste" />Amber, dashed edge: mapped waste remaining</p>
      <p><i className="command-legend-dot collected" />Green, solid edge: cleaned up</p>
    </div>
    <table className="w-full text-left text-xs">
      <caption className="sr-only">Simulated waste mass by category, in kilograms</caption>
      <thead className="text-[10px] text-[var(--cmd-muted)]"><tr><th scope="col" className="pb-2 font-normal">Category</th><th scope="col" className="pb-2 text-right font-normal">Remaining</th><th scope="col" className="pb-2 text-right font-normal">Cleaned</th></tr></thead>
      <tbody>{categories.map(item => <tr key={item.category} className="border-t border-[var(--cmd-border)]"><th scope="row" className="py-3 font-normal">{item.category}</th><td className="text-right tabular-nums">{(item.mappedKg - item.cleanedKg).toFixed(2)}</td><td className="text-right tabular-nums">{item.cleanedKg.toFixed(2)}</td></tr>)}</tbody>
    </table>
    <p className="mt-3 text-[10px] leading-relaxed text-[var(--cmd-muted)]">Detection decisions and confidence come from the incorporated R3-YOLO sample images. Masses and map footprints remain simulated.</p>
  </GlassPanel>;
}
