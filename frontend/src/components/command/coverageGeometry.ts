import type { FeatureCollection, Polygon } from "geojson";
import type { Coordinate, WasteObservation } from "./types";

// Approximate synthetic footprints, NOT measured cleaned land or robot sensor range.
// Geographic radii keep highlights stable when zooming; no individual trash markers.
export function cleanupCoverage(observations: WasteObservation[], botId: string): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: observations.filter(item => item.botId === botId).map(item => {
      const radiusM = item.density === "dense" ? 65 : item.density === "moderate" ? 45 : 30;
      const ring: Coordinate[] = Array.from({ length: 32 }, (_, index) => {
        const angle = index / 32 * Math.PI * 2;
        return [item.longitude + Math.cos(angle) * radiusM / (111320 * Math.cos(item.latitude * Math.PI / 180)), item.latitude + Math.sin(angle) * radiusM / 111320];
      });
      ring.push([...ring[0]]);
      return { type: "Feature", properties: { botId, cleaned: item.status === "collected" }, geometry: { type: "Polygon", coordinates: [ring] } };
    }),
  };
}
