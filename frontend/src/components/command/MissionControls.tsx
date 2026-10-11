import type { RobotState } from "./types";

export default function MissionControls({ robot, onToggleMission, onReset, resetting, className = "" }: {
  robot: RobotState;
  onToggleMission: () => void;
  onReset: () => void;
  resetting: boolean;
  className?: string;
}) {
  const phase = robot.collection?.phase ?? "collecting";
  const hasRuns = Boolean(robot.collection?.runs.length);
  const unavailable = robot.route.source === "unverified-preview";
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

  return <div className={`command-mission-actions flex gap-2 ${className}`} aria-label="Mission controls">
    <button type="button" onClick={onToggleMission} disabled={primaryDisabled} className="command-primary-button min-w-0 flex-1 whitespace-nowrap">{primaryLabel}</button>
    <button type="button" onClick={onReset} disabled={resetting} title="Reset selected bot’s demo mission and simulated battery" className="command-secondary-button">{resetting ? "Resetting..." : "Reset"}</button>
  </div>;
}
