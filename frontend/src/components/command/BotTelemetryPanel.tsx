import GlassPanel from "./GlassPanel";
import BotIcon from "./BotIcon";
import { formatDistance } from "./routeGeometry";
import type { RobotState } from "./types";

function percent(value: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
}

export default function BotTelemetryPanel({ robot }: { robot: RobotState }) {
  const meters = [
    { label: "Battery", value: `${Math.round(robot.batteryPct)}%`, percent: percent(robot.batteryPct, 100) },
    { label: "Payload", value: `${robot.payloadKg.toFixed(2)} / ${robot.capacityKg} kg`, percent: percent(robot.payloadKg, robot.capacityKg) },
    { label: "Route progress", value: `${Math.round(percent(robot.distanceM, robot.route.distanceM))}%`, percent: percent(robot.distanceM, robot.route.distanceM) },
  ];
  const details = [
    { label: "Bot status", value: robot.status.replaceAll("-", " ") },
    { label: "Mission", value: robot.missionStatus },
    { label: "Distance traveled", value: formatDistance(robot.distanceM) },
    { label: "Distance remaining", value: formatDistance(Math.max(0, robot.route.distanceM - robot.distanceM)) },
    { label: "Available capacity", value: `${Math.max(0, robot.capacityKg - robot.payloadKg).toFixed(2)} kg` },
    { label: "Latitude", value: `${robot.latitude.toFixed(5)}°` },
    { label: "Longitude", value: `${robot.longitude.toFixed(5)}°` },
  ];

  return <GlassPanel className="p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div><p className="command-kicker">R3 bot telemetry</p><h2 className="mt-1 font-semibold">{robot.id}</h2></div>
      <span className="command-bot-chip ground"><BotIcon type={robot.type} /></span>
    </div>
    <p className="mb-4 text-xs text-[var(--cmd-muted)]">{robot.area} · Simulated ground bot</p>
    <div className="space-y-4">
      {meters.map(meter => <div key={meter.label}>
        <div className="mb-2 flex justify-between gap-2 text-xs"><span className="text-[var(--cmd-muted)]">{meter.label}</span><strong className="tabular-nums">{meter.value}</strong></div>
        <div role="meter" aria-label={meter.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(meter.percent)} aria-valuetext={meter.value} className="h-1.5 overflow-hidden rounded-full bg-[var(--cmd-track)]">
          <div className="h-full rounded-full bg-[var(--cmd-accent)]" style={{ width: `${meter.percent}%` }} />
        </div>
      </div>)}
    </div>
    <dl className="mt-5 divide-y divide-[var(--cmd-border)] border-t border-[var(--cmd-border)]">
      {details.map(detail => <div key={detail.label} className="flex justify-between gap-3 py-2.5 text-xs">
        <dt className="text-[var(--cmd-muted)]">{detail.label}</dt><dd className="text-right capitalize tabular-nums">{detail.value}</dd>
      </div>)}
    </dl>
    {robot.route.source === "unverified-preview" && <p className="mt-3 text-xs text-[var(--cmd-muted)]">Route unverified. Simulated movement is unavailable.</p>}
    <p className="mt-4 border-t border-[var(--cmd-border)] pt-3 text-[10px] leading-relaxed text-[var(--cmd-muted)]">Updates with the local simulation. Position, battery, and payload are synthetic, not physical sensor readings.</p>
  </GlassPanel>;
}
