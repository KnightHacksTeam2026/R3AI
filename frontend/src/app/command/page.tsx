"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CommandHeader from "@/components/command/CommandHeader";
import CommandSplash from "@/components/command/CommandSplash";
import CommandSearch from "@/components/command/CommandSearch";
import PlacePanel from "@/components/command/PlacePanel";
import type { PlaceResult } from "@/components/command/placeSearch";
import MapControls from "@/components/command/MapControls";
import MissionPanel from "@/components/command/MissionPanel";
import BotTelemetryPanel from "@/components/command/BotTelemetryPanel";
import OperationsMap, { type OperationsMapHandle } from "@/components/command/OperationsMap";
import RobotPanel from "@/components/command/RobotPanel";
import TelemetryPanel from "@/components/command/TelemetryPanel";
import UniverseBackdrop from "@/components/command/UniverseBackdrop";
import { advanceSimulation, createDemoState, hydrateDemoState, regenerateBotMission, replaceMissionInState } from "@/components/command/demoData";
import type { Coordinate } from "@/components/command/types";
import useTheme from "@/components/shared/useTheme";
import styles from "./command.module.css";

export default function CommandPage() {
  const mapRef = useRef<OperationsMapHandle>(null);
  const mobileTrigger = useRef<HTMLButtonElement | null>(null);
  const refreshingBots = useRef(new Set<string>());
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [searchActive, setSearchActive] = useState(false);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [inspector, setInspector] = useState<"bots" | "telemetry">("bots");
  const { theme } = useTheme();
  const [demo, setDemo] = useState(createDemoState);
  const [selectedBotId, setSelectedBotId] = useState("R3-ORL-G01");
  const [mapCenter, setMapCenter] = useState<Coordinate>([-40, 25]);
  const [showWaste, setShowWaste] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"bots" | "mission" | "telemetry" | null>(null);
  const [resettingBotId, setResettingBotId] = useState<string | null>(null);
  const robot = demo.bots.find(bot => bot.id === selectedBotId)!;
  const assigned = useMemo(() => demo.observations.filter(item => item.botId === selectedBotId), [demo.observations, selectedBotId]);
  const runningCount = demo.bots.filter(bot => bot.missionStatus === "running").length;
  const running = runningCount > 0;

  useEffect(() => {
    let cancelled = false;
    hydrateDemoState().then(next => {
      if (!cancelled) setDemo(next);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const completed = demo.bots.filter(bot => bot.missionStatus === "complete" && bot.collection?.runs.length);
    completed.forEach(bot => {
      if (refreshingBots.current.has(bot.id)) return;
      refreshingBots.current.add(bot.id);
      regenerateBotMission(bot.id)
        .then(mission => {
          setDemo(current => {
            const currentBot = current.bots.find(candidate => candidate.id === bot.id);
            if (!currentBot || currentBot.collection !== bot.collection || currentBot.missionStatus !== "complete") return current;
            return replaceMissionInState(current, mission, true);
          });
          refreshingBots.current.delete(bot.id);
        })
        .catch(() => { /* Keep completion visible; Reset retries without a request loop. */ });
    });
  }, [demo.bots]);

  useEffect(() => {
    if (!running) return;
    let previous = performance.now();
    const formatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const resetClock = () => { previous = performance.now(); };
    document.addEventListener("visibilitychange", resetClock);
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min((now - previous) / 1000, 1);
      previous = now;
      if (document.hidden) return;
      setDemo(current => advanceSimulation(current, elapsed));
      setLastUpdate(formatter.format(new Date()));
    }, 200);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", resetClock); };
  }, [running]);

  function selectBot(id: string) {
    const bot = demo.bots.find(item => item.id === id);
    if (!bot) return;
    setPlace(null);
    setSelectedBotId(id);
    setMobilePanel(current => current === "telemetry" ? "telemetry" : "mission");
    mapRef.current?.focusBot(bot);
  }

  function selectPlace(result: PlaceResult) {
    setPlace(result);
    setMobilePanel("mission");
    setInspector("bots");
    mapRef.current?.focusPlace(result);
  }

  function closePlace() { setPlace(null); mapRef.current?.focusBot(robot); }

  function toggleMission() {
    setDemo(current => ({
      ...current,
      bots: current.bots.map(bot => {
        if (bot.id !== selectedBotId || bot.missionStatus === "complete" || bot.batteryPct <= 0 || bot.route.source === "unverified-preview") {
          return bot;
        }
        const paused = bot.missionStatus === "running";
        return { ...bot, missionStatus: paused ? "paused" : "running", status: paused ? "paused" : "collecting" };
      }),
    }));
  }

  async function resetMission() {
    const botId = selectedBotId;
    setResettingBotId(botId);
    const mission = await regenerateBotMission(botId);
    setDemo(current => replaceMissionInState(current, mission));
    refreshingBots.current.delete(botId);
    setResettingBotId(current => current === botId ? null : current);
  }

  const botsPanel = <RobotPanel bots={demo.bots} mapCenter={mapCenter} selectedId={selectedBotId} onSelect={selectBot} />;
  const missionPanel = place
    ? <PlacePanel place={place} bots={demo.bots} observations={demo.observations} onBot={selectBot} onClose={closePlace} />
    : <MissionPanel observations={assigned} robot={robot} onToggleMission={toggleMission} onReset={resetMission} resetting={resettingBotId === selectedBotId} />;
  const botTelemetryPanel = <BotTelemetryPanel robot={robot} />;

  return (
    <main className={`command ${styles.root} relative h-dvh overflow-hidden`} data-theme={theme}>
      <UniverseBackdrop theme={theme} />
      <OperationsMap key={mapAttempt} ref={mapRef} onStatusChange={setMapStatus} onRetry={() => { setMapStatus("loading"); setMapAttempt(value => value + 1); }} theme={theme} observations={demo.observations} bots={demo.bots} selectedBotId={selectedBotId} onSelectBot={selectBot} onCenterChange={setMapCenter} showWaste={showWaste && !place} showRoute={showRoute && !place} showBots={showBots} />
      <CommandSplash loading={mapStatus === "loading"} />

      <div inert={mapStatus === "loading"} className="command-scroll-frame pointer-events-none relative z-10 flex h-full flex-col p-3 sm:p-5">
        <div className="command-top-dock pointer-events-auto relative z-30 shrink-0">
          <CommandHeader search={
            <CommandSearch bots={demo.bots} onBot={selectBot} onPlace={selectPlace} open={searchActive} onOpenChange={setSearchActive} />
          } />
        </div>
        <div className="command-workspace hidden min-h-0 flex-1 lg:grid">
          <div className="command-mission-column command-panel-scroll pointer-events-auto min-h-0 max-h-full self-start overflow-y-auto rounded-[22px]">{missionPanel}</div>
          <aside aria-label="Mission inspector" className="command-inspector command-glass pointer-events-auto flex min-h-0 max-h-full flex-col self-start overflow-hidden">
            <div className="flex shrink-0 border-b border-[var(--cmd-border)] p-2" role="group" aria-label="Inspector view">
              {(["bots", "telemetry"] as const).map(view => <button key={view} type="button" aria-pressed={inspector === view} onClick={() => setInspector(view)} className={`min-h-11 flex-1 rounded-xl text-xs font-semibold ${inspector === view ? "bg-[var(--cmd-accent)] text-[var(--cmd-accent-text)]" : ""}`}>{view === "bots" ? `Fleet · ${demo.bots.length}` : "Bot telemetry"}</button>)}
            </div>
            <div className="command-inspector-content command-panel-scroll min-h-0 overflow-y-auto">{inspector === "bots" ? botsPanel : botTelemetryPanel}</div>
          </aside>
        </div>
        <div className="flex-1 lg:hidden" />
        <div className="command-mobile-dock command-glass pointer-events-auto shrink-0 overflow-hidden lg:hidden" onKeyDown={event => { if (event.key === "Escape") { setMobilePanel(null); mobileTrigger.current?.focus(); } }}>
          <div className="flex p-2" role="group" aria-label="Dashboard panels">{(["bots", "mission", "telemetry"] as const).map(panel =>
            <button key={panel} type="button" aria-expanded={mobilePanel === panel} aria-controls="mobile-command-panel" onClick={event => { mobileTrigger.current = event.currentTarget; setMobilePanel(current => current === panel ? null : panel); }} className={`min-h-11 flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold capitalize ${mobilePanel === panel ? "bg-[var(--cmd-accent)] text-[var(--cmd-accent-text)]" : ""}`}>{panel === "bots" ? "R3 BOTS" : panel}</button>
          )}</div>
          <div id="mobile-command-panel" hidden={!mobilePanel} className="command-inspector-content command-panel-scroll max-h-[36dvh] overflow-y-auto border-t border-[var(--cmd-border)]" role="region" aria-label={`${mobilePanel ?? "Mission"} details`}>{mobilePanel === "bots" ? botsPanel : mobilePanel === "mission" ? missionPanel : mobilePanel === "telemetry" ? botTelemetryPanel : null}</div>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-end">
          <MapControls status={<TelemetryPanel lastUpdate={lastUpdate} runningCount={runningCount} />} showWaste={showWaste && !place} setShowWaste={value => { setPlace(null); setShowWaste(value); }} showRoute={showRoute && !place} setShowRoute={value => { setPlace(null); setShowRoute(value); }} showBots={showBots} setShowBots={setShowBots} onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()} onRecenter={() => mapRef.current?.recenter()} onFocus={closePlace} />
        </div>
      </div>
    </main>
  );
}
