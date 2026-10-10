import { STREET_ROUTES } from "./streetRoutes";
import { routeFromLegs, routePosition } from "./routeGeometry";
import type { Coordinate, RobotState, WasteObservation } from "./types";

// Assignments, waste, density, mass, history and battery levels are all synthetic.
// Street geometry alone is derived from OSRM / OpenStreetMap snapshots.
export const DEMO_AREAS = [
  { id: "ORL", name: "Orlando", center: [-81.3755, 28.5422] },
  { id: "LON", name: "London", center: [-0.1246, 51.5086] },
  { id: "BCN", name: "Barcelona", center: [2.1659, 41.3894] },
  { id: "NBO", name: "Nairobi", center: [36.8197, -1.2842] },
  { id: "TYO", name: "Tokyo", center: [139.766, 35.674] },
  { id: "SYD", name: "Sydney", center: [151.2062, -33.871] },
  { id: "RIO", name: "Rio de Janeiro", center: [-43.1875, -22.9755] },
  { id: "SFO", name: "San Francisco", center: [-122.4174, 37.7765] },
] as const;

const CATEGORIES = [
  { name: "Plastic packaging", itemMass: 0.04 },
  { name: "Mixed paper", itemMass: 0.08 },
  { name: "Glass bottles", itemMass: 0.32 },
  { name: "Aluminum cans", itemMass: 0.015 },
  { name: "Mixed litter", itemMass: 0.12 },
];

export type DemoState = { bots: RobotState[]; observations: WasteObservation[] };

export function createDemoState(withHistory = true): DemoState {
  const bots: RobotState[] = [];
  const observations: WasteObservation[] = [];
  DEMO_AREAS.forEach((area, areaIndex) => {
    const type = "ground" as const;
    const id = `R3-${area.id}-G01`;
    const [lon, lat] = area.center;
    const street = STREET_ROUTES[area.id];
    const preview: Coordinate[] = [[lon, lat], [lon + 0.002, lat], [lon + 0.002, lat + 0.002], [lon, lat + 0.002]];
    const waypoints = street?.waypoints ?? preview;
    const legs = street ? street.legs : waypoints.slice(1).map((point, index) => [waypoints[index], point]);
    const route = routeFromLegs(legs, street ? "street-snapshot" : "unverified-preview");
    // A small synthetic traveled history, never real telemetry.
    const traveledM = withHistory && route.source !== "unverified-preview" ? route.distanceM * (0.35 + (areaIndex % 3) * 0.1) : 0;
    const { position } = routePosition(route, traveledM);
    const assigned = route.stopDistancesM.map((stopDistanceM, stopIndex): WasteObservation => {
      const category = CATEGORIES[(areaIndex + stopIndex) % CATEGORIES.length];
      const itemCount = 6 + ((areaIndex * 17 + stopIndex * 11) % 55);
      const point = legs[stopIndex].at(-1)!;
      return {
        id: `SYN-${area.id}-G${stopIndex + 1}`,
        botId: id, area: area.name, category: category.name, longitude: point[0], latitude: point[1],
        massKg: Number((itemCount * category.itemMass).toFixed(2)), itemCount,
        density: itemCount < 20 ? "sparse" : itemCount < 40 ? "moderate" : "dense",
        confidence: null, source: "synthetic", stopDistanceM,
        status: stopDistanceM <= traveledM ? "collected" : "mapped",
      };
    });
    observations.push(...assigned);
    bots.push({ id, type, area: area.name, longitude: position[0], latitude: position[1],
      capacityKg: 80,
      initialBatteryPct: 96 - areaIndex * 5,
      batteryPct: 96 - areaIndex * 5 - (route.distanceM ? traveledM / route.distanceM * 18 : 0),
      payloadKg: assigned.filter(item => item.status === "collected").reduce((sum, item) => sum + item.massKg, 0),
      status: route.source === "unverified-preview" ? "route-unavailable" : traveledM > 0 ? "paused" : "standby",
      route, distanceM: traveledM, missionStatus: traveledM > 0 ? "paused" : "ready",
    });
  });
  return { bots, observations };
}

export function advanceSimulation(state: DemoState, seconds: number): DemoState {
  const bots = state.bots.map(bot => {
    if (bot.missionStatus !== "running" || bot.route.source === "unverified-preview") return bot;
    const availableDistance = bot.batteryPct / 18 * bot.route.distanceM;
    const delta = Math.min(bot.route.distanceM / 40 * Math.max(0, seconds), availableDistance);
    const traveledM = Math.min(bot.route.distanceM, bot.distanceM + delta);
    const batteryPct = Math.max(0, bot.batteryPct - (bot.route.distanceM ? (traveledM - bot.distanceM) / bot.route.distanceM * 18 : 0));
    const { position } = routePosition(bot.route, traveledM);
    const complete = traveledM >= bot.route.distanceM;
    return { ...bot, batteryPct, distanceM: traveledM, longitude: position[0], latitude: position[1],
      missionStatus: complete ? "complete" as const : batteryPct <= 0 ? "paused" as const : "running" as const,
      status: complete ? "complete" as const : batteryPct <= 0 ? "low-battery" as const : "collecting" as const,
    };
  });
  const observations = state.observations.map(item => {
    const bot = bots.find(bot => bot.id === item.botId)!;
    if (item.stopDistanceM > bot.distanceM || bot.route.source === "unverified-preview") return item;
    const status = "collected" as const;
    return item.status === status ? item : { ...item, status } as WasteObservation;
  });
  return { bots: bots.map(bot => ({ ...bot, payloadKg: observations.filter(item => item.botId === bot.id && item.status === "collected").reduce((sum, item) => sum + item.massKg, 0) })), observations };
}
