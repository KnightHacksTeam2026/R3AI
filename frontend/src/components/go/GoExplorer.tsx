"use client";

import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import GoMap, { type GoMapHandle } from "./GoMap";
import GoIcon from "./GoIcon";
import useGoLocation from "./useGoLocation";
import useCleanupRoutes from "./useCleanupRoutes";
import { DEFAULT_CENTER, NEARBY_RADIUS_M, distanceToStart, routeLength } from "./cleanupRoutes";
import { WASTE_CATEGORIES, type GoSession, type WasteCategory } from "./demoData";
import { formatDistance } from "../command/routeGeometry";
import type { Coordinate } from "../command/types";
import styles from "./GoExplorer.module.css";

type Props = { session: GoSession; onSessionChange: (session: GoSession) => void; installed: boolean; installing: boolean; onInstall: () => void; notice: string };
const SAVED_KEY = "r3ai-go-saved-routes-v1";

export default function GoExplorer({ session, onSessionChange, installed, installing, onInstall, notice }: Props) {
  const feed = useCleanupRoutes();
  const map = useRef<GoMapHandle>(null);
  const search = useRef<HTMLInputElement>(null);
  const focusNextLocation = useRef(false);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const [center, setCenter] = useState<Coordinate>(DEFAULT_CENTER);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All routes");
  const [view, setView] = useState<"explore" | "saved" | "activity">("explore");
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedReady, setSavedReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [logMessage, setLogMessage] = useState("");
  const [offline, setOffline] = useState(false);
  const location = useGoLocation(position => {
    if (!focusNextLocation.current) return;
    setCenter(position.coordinate);
    map.current?.focus(position.coordinate);
    focusNextLocation.current = false;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
        if (!Array.isArray(raw) || raw.length > 500 || !raw.every(id => typeof id === "string" && id.length <= 160)) throw new Error("Invalid saved routes");
        setSaved(raw);
      } catch { setStorageNotice("Saved routes couldn’t be restored. You can still explore and save routes for this visit."); }
      setSavedReady(true);
      setOffline(!navigator.onLine);
    }, 0);
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.clearTimeout(timer); window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  const selected = feed.routes.find(route => route.id === selectedId);
  const results = useMemo(() => feed.routes
    .map(route => ({ route, distance: distanceToStart(route, center) }))
    .filter(({ route, distance }) => (view === "saved" ? saved.includes(route.id) : distance <= NEARBY_RADIUS_M) && (category === "All routes" || route.category === category) && `${route.name} ${route.area}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.distance - b.distance), [feed.routes, center, view, saved, category, query]);
  const visibleRoutes = useMemo(() => {
    const routes = results.map(result => result.route);
    if (selected && !routes.some(route => route.id === selected.id)) routes.push(selected);
    return routes;
  }, [results, selected]);

  function select(id: string) {
    const route = feed.routes.find(item => item.id === id);
    if (!route) return;
    setSelectedId(id);
    setExpanded(false);
    map.current?.fit(route);
  }

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); setStorageNotice(""); }
    catch { setStorageNotice("Device storage is unavailable. Your saved routes will last only for this visit."); }
  }

  function locate() {
    setSelectedId(null);
    setView("explore");
    setExpanded(false);
    setQuery("");
    if (location.position) { setCenter(location.position.coordinate); map.current?.focus(location.position.coordinate); }
    else { focusNextLocation.current = true; location.locate(); }
  }

  function changeView(next: typeof view) {
    setView(next); setSelectedId(null); setQuery(""); setCategory("All routes"); setExpanded(next === "activity");
  }

  function saveLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const count = Number(data.get("count"));
    const category = data.get("category") as WasteCategory;
    if (!Number.isInteger(count) || count < 1 || count > 999 || !WASTE_CATEGORIES.includes(category)) { setLogMessage("Enter 1–999 items and choose a category."); return; }
    onSessionChange({ ...session, entries: [{ id: crypto.randomUUID(), missionId: null, category, count, note: String(data.get("note") || "").trim().slice(0, 240), createdAt: new Date().toISOString() }, ...session.entries] });
    form.reset();
    setLogMessage("Added to your personal log.");
  }

  return <div className={styles.explorer}>
    <GoMap ref={map} routes={visibleRoutes} selectedId={selectedId} position={location.position} onSelect={select} onMove={setCenter} />
    <header className={styles.header}>
      <Navbar actions={!installed ? <button className={styles.install} onClick={onInstall} disabled={installing} aria-label={installing ? "Opening installation" : "Get the app"}><GoIcon name="download" size={17} /><span>{installing ? "Opening…" : "Get the app"}</span></button> : undefined} />
    </header>

    <div className={styles.areaPill}><span className={styles.areaDot} />{feed.samples ? "Exploring sample routes" : "Explore cleanup routes"}</div>
    <div className={styles.mapControls} aria-label="Map controls">
      <button onClick={locate} disabled={location.pending} aria-label={location.pending ? "Finding your location" : "Show my location"} className={location.enabled ? styles.locationActive : ""}><GoIcon name="locate" /></button>
      <button onClick={() => map.current?.north()} aria-label="Reset map north"><span className={styles.north}>N</span><GoIcon name="compass" size={21} /></button>
      <div className={styles.zoom}><button onClick={() => map.current?.zoom(1)} aria-label="Zoom in"><GoIcon name="plus" /></button><button onClick={() => map.current?.zoom(-1)} aria-label="Zoom out"><GoIcon name="minus" /></button></div>
    </div>

    <section className={styles.sheet} data-expanded={expanded} aria-label="Explore cleanup routes" onKeyDown={event => { if (event.key === "Escape") { setSelectedId(null); setExpanded(false); search.current?.focus(); } }}>
      <button className={styles.grabber} aria-label={expanded ? "Collapse route sheet" : "Expand route sheet"} aria-expanded={expanded} aria-controls="go-sheet-content" onClick={() => { if (!dragged.current) setExpanded(value => !value); dragged.current = false; }} onPointerDown={event => { dragged.current = false; dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={event => { if (dragStart.current !== null && Math.abs(event.clientY - dragStart.current) > 30) { dragged.current = true; setExpanded(event.clientY < dragStart.current); } dragStart.current = null; }} onPointerCancel={() => { dragStart.current = null; dragged.current = false; }}><span /></button>
      <nav className={styles.tabs} aria-label="Go navigation">
        {([{ id: "explore", name: "Explore", icon: "compass" }, { id: "saved", name: "Saved", icon: "bookmark" }, { id: "activity", name: "My activity", icon: "log" }] as const).map(tab => <button key={tab.id} className={view === tab.id ? styles.tabActive : ""} aria-current={view === tab.id ? "page" : undefined} onClick={() => changeView(tab.id)}><GoIcon name={tab.icon} size={17} />{tab.name}</button>)}
      </nav>
      <div id="go-sheet-content" className={styles.sheetContent}>
        {(offline || notice || storageNotice) && <p className={styles.notice} role="status">{offline ? "You’re offline. Map details and route updates may be unavailable." : notice || storageNotice}</p>}
        {location.error && <div className={styles.notice} role="alert">{location.error}<button onClick={locate}>Try location again</button></div>}

        {selected ? <div className={styles.detail}>
          <div className={styles.detailHeading}><span className={styles.categoryLabel}>{selected.category} · {selected.sample ? "Sample route" : "Cleanup route"}</span><button className={styles.close} aria-label="Close route details" onClick={() => { setSelectedId(null); search.current?.focus(); }}><GoIcon name="close" size={20} /></button></div>
          <h1>{selected.name}</h1><p className={styles.subtitle}><GoIcon name="pin" size={15} />{selected.area}</p>
          <div className={styles.stats}><div><strong>{formatDistance(routeLength(selected))}</strong><span>route length</span></div><div><strong>~{Math.max(1, Math.round(routeLength(selected) / 70))} min</strong><span>walk, before cleanup</span></div><div><strong>{selected.category === "Park" ? "Park" : selected.category === "Waterfront" ? "Waterside" : "Streets"}</strong><span>surroundings</span></div></div>
          <p className={styles.description}>{selected.description}</p>
          {selected.sample && <p className={styles.sampleNote}>Illustrative path · No verified waste reports or access checks.</p>}
          <div className={styles.actions}><a className={styles.primary} target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.coordinates[0][1]},${selected.coordinates[0][0]}&travelmode=walking`}><GoIcon name="arrow" size={18} />Directions to start</a><button className={styles.saveButton} disabled={!savedReady} aria-pressed={saved.includes(selected.id)} onClick={() => toggleSaved(selected.id)}><GoIcon name={saved.includes(selected.id) ? "check" : "bookmark"} size={19} />{saved.includes(selected.id) ? "Saved" : "Save"}</button></div>
          <p className={styles.finePrint}>Opens walking directions in Google Maps. Cleanup time varies.</p>
          <button className={styles.textButton} onClick={() => changeView("activity")}><GoIcon name="plus" size={17} />Log a cleanup</button>
        </div> : view === "activity" ? <>
          <p className={styles.kicker}>SMALL ACTIONS ADD UP</p><h1>Your little bit of good.</h1><p className={styles.subtitle}>A personal cleanup log, saved on this device.</p>
          <div className={styles.activityStats}><strong>{session.entries.reduce((sum, entry) => sum + entry.count, 0)}<span>items collected</span></strong><strong>{session.entries.length}<span>cleanup entries</span></strong></div>
          <form className={styles.logForm} onSubmit={saveLog}><h2>Log a cleanup</h2><div className={styles.formRow}><label>Category<select name="category">{WASTE_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label>Items<input type="number" inputMode="numeric" name="count" min={1} max={999} step={1} placeholder="0" required /></label></div><label>Note <span>(optional)</span><textarea name="note" rows={2} maxLength={240} placeholder="A little about your cleanup…" /></label><button className={styles.primary} type="submit"><GoIcon name="plus" size={18} />Add to my log</button>{logMessage && <p className={styles.finePrint} role="status">{logMessage}</p>}</form>
          <h2 className={styles.listHeading}>Recent activity</h2>{session.entries.length ? session.entries.map(entry => <article className={styles.logEntry} key={entry.id}><span className={styles.routeIcon}><GoIcon name="check" /></span><div><strong>{entry.count} {entry.category.toLowerCase()} {entry.count === 1 ? "item" : "items"}</strong><small>{new Date(entry.createdAt).toLocaleDateString()}</small>{entry.note && <p>{entry.note}</p>}</div></article>) : <p className={styles.finePrint}>Your first cleanup will appear here.</p>}
        </> : <>
          <div className={styles.titleRow}><div><p className={styles.kicker}>{view === "saved" ? "GOOD PLACES, KEPT CLOSE" : "GO OUT. DO A LITTLE GOOD."}</p><h1>{view === "saved" ? "Your saved routes" : "A cleaner corner of the world."}</h1></div><span className={styles.headingIcon}><GoIcon name={view === "saved" ? "bookmark" : "leaf"} size={25} /></span></div>
          <label className={styles.search}><GoIcon name="search" size={20} /><input ref={search} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search routes or neighborhoods" aria-label="Search cleanup routes by name or neighborhood" />{query && <button aria-label="Clear search" onClick={() => { setQuery(""); search.current?.focus(); }}><GoIcon name="close" size={17} /></button>}</label>
          <div className={styles.filters} aria-label="Route categories">{["All routes", "Park", "Waterfront", "Neighborhood"].map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === "Park" ? "Parks" : item}</button>)}</div>
          {view === "explore" && <div className={styles.locationCard}><span className={styles.locationIcon}><GoIcon name="locate" size={21} /></span><div><strong>{location.pending ? "Finding your location…" : location.enabled && location.position ? "Your location is on" : "Find your next little adventure"}</strong><p>{location.position ? `Accuracy about ${Math.round(location.position.accuracy)} m. Location stays in this app.` : "Use your location to explore routes nearby."}</p>{location.enabled && <button className={styles.textButton} onClick={() => { focusNextLocation.current = false; location.stop(); }}>Turn location off</button>}</div><button className={styles.locationButton} disabled={location.pending} onClick={locate}>{location.position ? "Recenter" : "Locate me"}</button></div>}
          <div className={styles.listHeader}><h2>{view === "saved" ? "Ready when you are" : "Around this area"}</h2><span aria-live="polite">{feed.loading ? "Loading…" : `${results.length} ${results.length === 1 ? "route" : "routes"}`}</span></div>
          <p className={styles.listHint}>{view === "saved" ? "Saved on this device · distances from map center" : "Within 5 km of map center · nearest start first"}</p>
          {feed.error ? <div className={styles.empty}><GoIcon name="compass" size={30} /><h3>Let’s try that again</h3><p>{feed.error}</p><button className={styles.primary} onClick={feed.retry}>Reload routes</button></div> : feed.loading ? <div className={styles.skeleton} role="status">Finding cleanup routes…</div> : results.length ? <div className={styles.routeList}>{results.map(({ route, distance }) => <button className={styles.routeCard} key={route.id} onClick={() => select(route.id)}><span className={styles.routeIcon} data-category={route.category}><GoIcon name={route.category === "Waterfront" ? "water" : route.category === "Park" ? "leaf" : "pin"} size={25} /></span><span className={styles.routeBody}><span className={styles.routeCategory}>{route.category}{route.sample && " · SAMPLE"}</span><strong>{route.name}</strong><span className={styles.routeMeta}>{formatDistance(routeLength(route))} walk <i />{formatDistance(distance)} to start</span><small>{route.area}</small></span><GoIcon name="chevron" size={18} /></button>)}</div> : <div className={styles.empty}><GoIcon name={view === "saved" ? "bookmark" : "compass"} size={32} /><h3>{view === "saved" ? "Keep a good place in mind." : "A fresh place to explore."}</h3><p>{view === "saved" ? "Save a route from its details to find it here." : query || category !== "All routes" ? "No routes match these filters. Try another name or category." : "There are no listed cleanup routes within 5 km of this map center. Move the map to explore another area."}</p>{(query || category !== "All routes") && <button className={styles.textButton} onClick={() => { setQuery(""); setCategory("All routes"); }}>Clear filters</button>}{feed.samples && view === "explore" && <button className={styles.primary} onClick={() => { setQuery(""); setCategory("All routes"); map.current?.focus(DEFAULT_CENTER); }}>Explore Orlando samples</button>}</div>}
          {feed.samples && <p className={styles.sampleNote}>Sample routes for exploring Go. Real cleanup listings aren’t connected yet.</p>}
        </>}
        <footer className={styles.sheetFooter}><GoIcon name="leaf" size={14} /><span>Small steps. A shared planet.</span><Link href="/command">Command <GoIcon name="arrow" size={13} /></Link></footer>
      </div>
    </section>
  </div>;
}
