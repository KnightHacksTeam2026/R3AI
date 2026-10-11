"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces, type PlaceResult } from "./placeSearch";
import type { RobotState } from "./types";

type Props = { bots: RobotState[]; onBot: (id: string) => void; onPlace: (place: PlaceResult) => void; open: boolean; onOpenChange: (open: boolean) => void };

export default function CommandSearch({ bots, onBot, onPlace, open, onOpenChange: setOpen }: Props) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const normalized = query.trim().toLocaleLowerCase();
  const matching = bots.filter(bot => `${bot.id} ${bot.area} ${bot.type}`.toLocaleLowerCase().includes(normalized));

  function dismiss() {
    input.current?.focus();
    setOpen(false);
  }

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [setOpen]);

  async function submit() {
    if (normalized.length < 2) return;
    const exactBot = bots.find(bot => bot.id.toLocaleLowerCase() === normalized);
    if (exactBot) { onBot(exactBot.id); setOpen(false); return; }
    if (normalized.startsWith("r3-")) { setOpen(true); return; }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setOpen(true); setStatus("loading"); setPlaces([]);
    const timeout = window.setTimeout(() => request.abort(), 10000);
    try {
      const results = await searchPlaces(query, request.signal);
      if (controller.current !== request || request.signal.aborted) return;
      setPlaces(results); setStatus("done");
    } catch {
      if (controller.current === request) setStatus("error");
    } finally { window.clearTimeout(timeout); }
  }

  return <div ref={root} className="pointer-events-auto relative z-30 w-full" onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === "Escape") dismiss();
    if (event.key === "ArrowDown" && event.target === input.current) { event.preventDefault(); root.current?.querySelector<HTMLButtonElement>("[data-search-result]")?.focus(); }
  }}>
    <form role="search" aria-label="Global map search" onSubmit={event => { event.preventDefault(); void submit(); }} className="command-search-surface flex items-center gap-2 rounded-2xl">
      <svg className="command-search-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
      <input ref={input} type="search" maxLength={120} value={query} onFocus={() => setOpen(true)} onChange={event => {
        controller.current?.abort(); controller.current = null;
        setQuery(event.target.value); setPlaces([]); setStatus("idle"); setOpen(true);
      }} aria-label="Search cities, countries or robots" aria-controls={open ? "command-search-results" : undefined} placeholder="City, country or R3 BOT…" className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-1 text-sm outline-none placeholder:text-[var(--cmd-muted)]" />
      <button type="submit" disabled={normalized.length < 2 || status === "loading"} aria-label={status === "loading" ? "Searching" : "Search"} className="command-search-submit"><span aria-hidden="true">{status === "loading" ? "…" : "↵"}</span></button>
    </form>
    {open && <div id="command-search-results" className="command-popover command-panel-scroll absolute top-full mt-2 max-h-[45dvh] w-full overflow-y-auto rounded-2xl border border-[var(--cmd-border)] p-3">
      <div className="mb-2 flex items-center justify-between"><p className="command-kicker">{normalized ? "Matching robots" : "Explore the demo fleet"}</p><button type="button" className="command-search-close" aria-label="Close search results" onClick={dismiss}>×</button></div>
      {(normalized ? matching : matching.slice(0, 3)).map(bot => <button data-search-result key={bot.id} type="button" onClick={() => { onBot(bot.id); setQuery(bot.id); setOpen(false); }} className="mb-1 block w-full rounded-xl p-3 text-left hover:bg-[var(--cmd-hover)] focus-visible:bg-[var(--cmd-hover)]"><span className="block text-xs font-semibold">{bot.id} · {bot.area}</span><span className="mt-1 block text-[11px] text-[var(--cmd-muted)]">Simulated ground bot · {bot.status} · {Math.round(bot.batteryPct)}% battery</span></button>)}
      {!matching.length && <p className="py-2 text-xs text-[var(--cmd-muted)]">No matching robots in this demo fleet.</p>}
      <p className="command-kicker mb-2 mt-3">Cities & countries</p>
      <p role="status" className="text-xs text-[var(--cmd-muted)]">{status === "loading" ? "Searching worldwide…" : status === "error" ? "Place search is unavailable. Try again; robot search still works." : status === "done" ? `${places.length} place results` : "Enter at least 2 characters and press Search. Place queries are sent to the geocoding provider."}</p>
      {places.map(place => <button data-search-result key={place.id} type="button" onClick={() => { onPlace(place); setQuery(place.name); setOpen(false); }} className="mt-1 block w-full rounded-xl p-3 text-left hover:bg-[var(--cmd-hover)] focus-visible:bg-[var(--cmd-hover)]"><span className="block text-sm font-semibold">{place.name}</span><span className="mt-1 block text-xs capitalize text-[var(--cmd-muted)]">{place.kind}{place.description ? ` · ${place.description}` : ""}</span></button>)}
      <p className="mt-3 border-t border-[var(--cmd-border)] pt-2 text-[10px] text-[var(--cmd-muted)]">Places: Photon · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap</a>. Robot and cleanup data are synthetic.</p>
    </div>}
  </div>;
}
