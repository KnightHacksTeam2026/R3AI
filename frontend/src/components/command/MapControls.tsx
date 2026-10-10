import GlassPanel from "./GlassPanel";

export default function MapControls({ showWaste, setShowWaste, showRoute, setShowRoute, showBots, setShowBots, onZoomIn, onZoomOut, onRecenter, onFocus }: {
  showWaste: boolean; setShowWaste: (v: boolean) => void; showRoute: boolean; setShowRoute: (v: boolean) => void; showBots: boolean; setShowBots: (v: boolean) => void; onZoomIn: () => void; onZoomOut: () => void; onRecenter: () => void; onFocus: () => void;
}) {
  const layers = [
    { label: "Cleanup coverage", checked: showWaste, change: setShowWaste },
    { label: "Selected route", checked: showRoute, change: setShowRoute },
    { label: "R3 BOTS", checked: showBots, change: setShowBots },
  ];
  return <GlassPanel className="flex items-center gap-1 p-1.5 text-xs">
    <button type="button" onClick={onZoomOut} className="command-map-button rounded-xl" aria-label="Zoom out">−</button>
    <button type="button" onClick={onZoomIn} className="command-map-button rounded-xl" aria-label="Zoom in">+</button>
    <button type="button" onClick={onFocus} className="min-h-11 rounded-xl px-2 hover:bg-[var(--cmd-hover)]">Focus bot</button>
    <button type="button" onClick={onRecenter} className="min-h-11 rounded-xl px-2 hover:bg-[var(--cmd-hover)]">World</button>
    <details className="relative" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-xl px-2 hover:bg-[var(--cmd-hover)]">Layers{layers.some(layer => !layer.checked) ? ` · ${layers.filter(layer => layer.checked).length}/3` : ""}</summary>
      <div className="absolute bottom-14 right-0 w-56 rounded-2xl border border-[var(--cmd-border)] bg-[var(--cmd-panel-solid)] p-3 shadow-[var(--cmd-shadow)]">
        <p className="command-kicker mb-2">Map visibility</p>
        {layers.map(layer => <label key={layer.label} className="flex min-h-11 cursor-pointer items-center justify-between gap-3"><span>{layer.label}</span><input type="checkbox" checked={layer.checked} onChange={event => layer.change(event.target.checked)} className="h-4 w-4 accent-[var(--cmd-accent)]" /></label>)}
        <p className="mt-2 text-[10px] text-[var(--cmd-muted)]">Coverage and route belong to the selected bot.</p>
      </div>
    </details>
  </GlassPanel>;
}
