import type { FeatureCollection, Polygon } from "geojson";
import type { Coordinate, RobotState, WasteObservation } from "./types";

// Approximate synthetic footprints, NOT measured cleaned land or robot sensor range.
// Geographic radii keep highlights stable when zooming; no individual trash markers.
export function coverageRadiusM(density: WasteObservation["density"]) {
  return density === "dense" ? 65 : density === "moderate" ? 45 : 30;
}

function circle(longitude: number, latitude: number, radiusM: number): Coordinate[] {
  const ring: Coordinate[] = Array.from({ length: 32 }, (_, index) => {
    const angle = index / 32 * Math.PI * 2;
    return [longitude + Math.cos(angle) * radiusM / (111320 * Math.cos(latitude * Math.PI / 180)), latitude + Math.sin(angle) * radiusM / 111320];
  });
  ring.push([...ring[0]]);
  return ring;
}

export function scanCoverage(robot: RobotState): FeatureCollection<Polygon> {
  const frames = robot.collection?.scanFrames ?? [];
  const scanComplete = robot.collection?.phase === "collecting" || robot.missionStatus === "complete";
  return {
    type: "FeatureCollection",
    features: frames.map(frame => {
      const scanned = scanComplete || frame.scanDistanceM <= robot.distanceM;
      return {
        type: "Feature",
        properties: { botId: robot.id, cleaned: scanned, scanZone: true, trashDetected: scanned ? frame.trashDetected : null },
        geometry: { type: "Polygon", coordinates: [circle(frame.longitude, frame.latitude, frame.radiusM)] },
      };
    }),
  };
}

export function cleanupCoverage(observations: WasteObservation[], botId: string): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: observations.filter(item => item.botId === botId && item.discovered).map(item => {
      const radiusM = coverageRadiusM(item.density);
      return { type: "Feature", properties: { botId, cleaned: item.status === "collected" }, geometry: { type: "Polygon", coordinates: [circle(item.longitude, item.latitude, radiusM)] } };
    }),
  };
}
