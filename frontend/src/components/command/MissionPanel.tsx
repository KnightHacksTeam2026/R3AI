import GlassPanel from "./GlassPanel";
import BotIcon from "./BotIcon";
import { formatDistance } from "./routeGeometry";
import type { RobotState, WasteObservation } from "./types";

type MissionPanelProps = {
  observations: WasteObservation[];
  robot: RobotState;
  onToggleMission: () => void;
  onReset: () => void;
  resetting: boolean;
};

export default function MissionPanel({ observations, robot, onToggleMission, onReset, resetting }: MissionPanelProps) {
  const discovered = observations.filter(item => item.discovered);
  const collected = discovered.filter(item => item.status === "collected");
  const recovered = collected.reduce((sum, item) => sum + item.massKg, 0);
  const estimated = discovered.reduce((sum, item) => sum + item.massKg, 0);
  const percent = robot.route.distanceM ? Math.round(robot.distanceM / robot.route.distanceM * 100) : 0;
  const unavailable = robot.route.source === "unverified-preview";
  const phase = robot.collection?.phase ?? "collecting";
  const humanRequired = discovered.filter(item => item.humanRequired).length;
  const hasRuns = Boolean(robot.collection?.runs.length);
  const humanOnly = robot.missionIssue === "human-only";
  const primaryDisabled = robot.missionStatus === "complete" || unavailable || robot.batteryPct <= 0 || (phase === "collecting" && !hasRuns);
  const primaryLabel = robot.batteryPct <= 0
    ? "Battery empty"
    : unavailable
      ? "Route unavailable"
      : humanOnly && phase === "collecting"
        ? "Human pickup required"
        : phase === "scanning"
          ? robot.missionStatus === "running"
            ? "Pause scan"
            : robot.missionStatus === "paused"
              ? "Resume scan"
              : "Start scan"
          : !hasRuns
            ? "No route available"
            : robot.missionStatus === "running"
              ? "Pause collection"
              : robot.missionStatus === "paused"
                ? "Resume collection"
                : robot.missionStatus === "complete"
                  ? "Complete"
                  : "Run collection";
  const missionNote = humanOnly && phase === "collecting"
    ? "The scan finished, but the remaining trash clusters are oversized and require human handling."
    : phase === "scanning"
      ? "The bot is still scanning the route, so trash locations stay hidden until the scan passes them and the bot returns to base."
      : null;

  return <GlassPanel className="p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><div><p className="command-kicker">Selected bot · {phase} · {robot.missionStatus}</p><h2 className="mt-1 font-semibold">{robot.id}</h2></div><span className={`command-bot-chip ${robot.type}`}><BotIcon type={robot.type} /></span></div>
    <p className="mb-3 text-xs text-[var(--cmd-muted)]">{robot.area} · Ground collection · Synthetic</p>
    {robot.collection ? <p className="mb-3 text-xs text-[var(--cmd-muted)]">{phase === "scanning" ? `Scan route in progress · ${discovered.length} targets discovered so far.` : `Load ${Math.min(robot.collection.runIndex + 1, robot.collection.runs.length)} / ${robot.collection.runs.length} · ${humanRequired} items need human pickup.`} Payload empties at base between loads; the same trash remains until collected.</p> : null}
    {missionNote ? <p className="mb-3 rounded-xl border border-[var(--cmd-border)] bg-[var(--cmd-soft)] px-3 py-2 text-xs text-[var(--cmd-muted)]">{missionNote}</p> : null}
    <div className="command-mission-actions mb-3 flex gap-2"><button type="button" onClick={onToggleMission} disabled={primaryDisabled} className="command-primary-button min-w-0 flex-1">{primaryLabel}</button><button type="button" onClick={onReset} disabled={resetting} title="Reset selected bot’s demo mission and simulated battery" className="command-secondary-button">{resetting ? "Resetting..." : "Reset"}</button></div>
    <div className="mb-1 flex justify-between text-xs"><span className="text-[var(--cmd-muted)]">Battery · simulated</span><strong>{Math.round(robot.batteryPct)}%</strong></div>
    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--cmd-track)]" role="progressbar" aria-label="Simulated battery level" aria-valuenow={Math.round(robot.batteryPct)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--cmd-accent)] transition-all" style={{ width: `${robot.batteryPct}%` }} /></div>
    <div className="mb-3 grid grid-cols-3 gap-2">
      {[{ label: "Discovered", value: discovered.length }, { label: "Cleaned", value: collected.length }, { label: "Remaining", value: discovered.length - collected.length }].map(metric =>
        <div key={metric.label} className="rounded-xl border border-[var(--cmd-border)] bg-[var(--cmd-soft)] p-2.5"><div className="text-lg font-semibold text-[var(--cmd-accent)]">{metric.value}</div><div className="mt-1 text-[10px] text-[var(--cmd-muted)]">{metric.label}</div></div>
      )}
    </div>
    <div className="mb-1 flex justify-between text-xs"><span className="text-[var(--cmd-muted)]">Route progress</span><span>{percent}%</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cmd-track)]" role="progressbar" aria-label="Mission route progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[var(--cmd-accent)] transition-all duration-200" style={{ width: `${percent}%` }} /></div>
    <div className="mt-3 flex justify-between text-xs"><span className="text-[var(--cmd-muted)]">Traveled / planned</span><span>{formatDistance(robot.distanceM)} / {formatDistance(robot.route.distanceM)}</span></div>
    <div className="mt-2 flex justify-between text-xs"><span className="text-[var(--cmd-muted)]">Collected / remaining mass</span><span>{recovered.toFixed(2)} / {(estimated - recovered).toFixed(2)} kg</span></div>
    <div className="mt-2 flex justify-between text-xs"><span className="text-[var(--cmd-muted)]">Payload / capacity</span><span>{`${robot.payloadKg.toFixed(2)} / ${robot.capacityKg} kg`}</span></div>
    <details className="mt-4 text-[11px] leading-relaxed text-[var(--cmd-muted)]"><summary className="cursor-pointer py-2">Simulation & route notes</summary><p className="mt-2">
      {unavailable ? "Unverified waypoint preview only. Ground movement is disabled until street-route data is available." : robot.collection ? "The bot first scans a road-bound loop, returns to base, then replays collection loads planned from the discovered trash clusters. Pickup paths stay constrained to stored road snapshots." : <>Street-route snapshot · <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>. Not live obstacle or robot-access clearance.</>}
      {" "}The bot completes every collectable pickup before a new synthetic mission is generated. No physical bot or external telemetry connection.
    </p></details>
  </GlassPanel>;
}
