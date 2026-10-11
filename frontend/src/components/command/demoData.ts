import { STREET_ROUTES } from "./streetRoutes";
import { routeFromLegs, routePosition } from "./routeGeometry";
import type { Coordinate, RobotState, WasteObservation } from "./types";

// Assignment metadata stays synthetic, but robot scan missions come from backend logic.
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

const DEFAULT_SCAN_RADIUS_MILES = 10;
const DEFAULT_ITEM_COUNT = 12;
const DEFAULT_ROBOT_DIMENSIONS = { x: 15, y: 15, z: 3, weightCapacityKg: 20, life: 100 };

type DemoArea = typeof DEMO_AREAS[number];
type BackendMissionItem = {
  id: string;
  category: string;
  longitude: number;
  latitude: number;
  xDim: number;
  yDim: number;
  zDim: number;
  weightKg: number;
  itemCount: number;
  density: WasteObservation["density"];
  area: string;
  pickupRank: number | null;
  stored: boolean;
};
type BackendMissionResponse = {
  botId: string;
  areaId: string;
  areaName: string;
  startLongitude: number;
  startLatitude: number;
  routeCoordinates: Coordinate[];
  items: BackendMissionItem[];
  storedItemIds: string[];
  unstoredItemIds: string[];
  pickupOrderIds: string[];
  humanRequiredItemIds: string[];
  runs: { routeCoordinates: Coordinate[]; pickupOrderIds: string[] }[];
  robotState: {
    xAvailable: number;
    yAvailable: number;
    availableWeight: number;
    weightCapacityKg: number;
    zLimit: number;
    life: number;
  };
};
type MissionSlice = { bot: RobotState; observations: WasteObservation[] };

export type DemoState = {
  bots: RobotState[];
  observations: WasteObservation[];
  humanRequiredItems?: WasteObservation[];
};

function createFallbackAreaSlice(area: DemoArea, areaIndex: number, withHistory: boolean): MissionSlice {
  const type = "ground" as const;
  const id = `R3-${area.id}-G01`;
  const [lon, lat] = area.center;
  const street = STREET_ROUTES[area.id];
  const preview: Coordinate[] = [[lon, lat], [lon + 0.002, lat], [lon + 0.002, lat + 0.002], [lon, lat + 0.002]];
  const waypoints = street?.waypoints ?? preview;
  const legs = street ? street.legs : waypoints.slice(1).map((point, index) => [waypoints[index], point]);
  const route = routeFromLegs(legs, street ? "street-snapshot" : "unverified-preview");
  const traveledM = withHistory && route.source !== "unverified-preview" ? route.distanceM * (0.35 + (areaIndex % 3) * 0.1) : 0;
  const { position } = routePosition(route, traveledM);
  const observations = route.stopDistancesM.map((stopDistanceM, stopIndex): WasteObservation => {
    const category = CATEGORIES[(areaIndex + stopIndex) % CATEGORIES.length];
    const itemCount = 6 + ((areaIndex * 17 + stopIndex * 11) % 55);
    const point = legs[stopIndex].at(-1)!;
    return {
      id: `SYN-${area.id}-G${stopIndex + 1}`,
      botId: id,
      area: area.name,
      category: category.name,
      longitude: point[0],
      latitude: point[1],
      massKg: Number((itemCount * category.itemMass).toFixed(2)),
      itemCount,
      density: itemCount < 20 ? "sparse" : itemCount < 40 ? "moderate" : "dense",
      confidence: null,
      source: "synthetic",
      stopDistanceM,
      status: stopDistanceM <= traveledM ? "collected" : "mapped",
    };
  });

  return {
    bot: {
      id,
      type,
      area: area.name,
      longitude: position[0],
      latitude: position[1],
      capacityKg: 80,
      initialBatteryPct: 96 - areaIndex * 5,
      batteryPct: 96 - areaIndex * 5 - (route.distanceM ? traveledM / route.distanceM * 18 : 0),
      payloadKg: observations.filter(item => item.status === "collected").reduce((sum, item) => sum + item.massKg, 0),
      status: route.source === "unverified-preview" ? "route-unavailable" : traveledM > 0 ? "paused" : "standby",
      route,
      distanceM: traveledM,
      missionStatus: traveledM > 0 ? "paused" : "ready",
    },
    observations,
  };
}

function buildLegsFromRoute(points: Coordinate[]): Coordinate[][] {
  if (points.length === 0) return [];
  if (points.length === 1) return [[points[0], points[0]]];
  return points.slice(1).map((point, index) => [points[index], point]);
}

function missionToSlice(area: DemoArea, areaIndex: number, mission: BackendMissionResponse): MissionSlice {
  const start: Coordinate = [mission.startLongitude, mission.startLatitude];
  const runs = mission.runs.map(run => ({
    pickupOrderIds: run.pickupOrderIds,
    route: routeFromLegs(buildLegsFromRoute(run.routeCoordinates), "osrm-trip"),
  }));
  const route = runs[0]?.route ?? routeFromLegs([[start, start]], "osrm-trip");
  const humanIds = new Set(mission.humanRequiredItemIds);

  const observations = mission.items.map((item): WasteObservation => {
    const stopIndex = runs[0]?.pickupOrderIds.indexOf(item.id) ?? -1;
    const stopDistanceM = stopIndex >= 0 ? route.stopDistancesM[stopIndex] : Infinity;
    return {
      id: item.id,
      botId: mission.botId,
      area: area.name,
      category: item.category,
      longitude: item.longitude,
      latitude: item.latitude,
      massKg: item.weightKg,
      itemCount: item.itemCount,
      density: item.density,
      confidence: null,
      source: "synthetic",
      stopDistanceM,
      status: "mapped",
      humanRequired: humanIds.has(item.id),
      dimensions: [item.xDim, item.yDim, item.zDim],
    };
  });

  return {
    bot: {
      id: mission.botId,
      type: "ground",
      area: area.name,
      longitude: start[0],
      latitude: start[1],
      capacityKg: mission.robotState.weightCapacityKg,
      initialBatteryPct: 96 - areaIndex * 5,
      batteryPct: 96 - areaIndex * 5,
      payloadKg: 0,
      status: "standby",
      route,
      distanceM: 0,
      missionStatus: "ready",
      collection: { start, runs, runIndex: 0 },
    },
    observations,
  };
}

async function requestMission(area: DemoArea): Promise<BackendMissionResponse> {
  const response = await fetch("/api/command/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      areaId: area.id,
      areaName: area.name,
      botId: `R3-${area.id}-G01`,
      startLongitude: area.center[0],
      startLatitude: area.center[1],
      scanRadiusMiles: DEFAULT_SCAN_RADIUS_MILES,
      itemCount: DEFAULT_ITEM_COUNT,
      robotXDim: DEFAULT_ROBOT_DIMENSIONS.x,
      robotYDim: DEFAULT_ROBOT_DIMENSIONS.y,
      robotZDim: DEFAULT_ROBOT_DIMENSIONS.z,
      weightCapacityKg: DEFAULT_ROBOT_DIMENSIONS.weightCapacityKg,
      life: DEFAULT_ROBOT_DIMENSIONS.life,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mission scan failed with status ${response.status}`);
  }

  return response.json() as Promise<BackendMissionResponse>;
}

function areaIndexForBot(botId: string): number {
  return DEMO_AREAS.findIndex(area => botId.includes(`-${area.id}-`));
}

export function createDemoState(withHistory = true): DemoState {
  const slices = DEMO_AREAS.map((area, areaIndex) => createFallbackAreaSlice(area, areaIndex, withHistory));
  return {
    bots: slices.map(slice => slice.bot),
    observations: slices.flatMap(slice => slice.observations),
  };
}

export async function hydrateDemoState(withHistory = true): Promise<DemoState> {
  try {
    const slices = await Promise.all(DEMO_AREAS.map(async (area, areaIndex) => missionToSlice(area, areaIndex, await requestMission(area))));
    const observations = slices.flatMap(slice => slice.observations);
    return {
      bots: slices.map(slice => slice.bot),
      observations,
      humanRequiredItems: observations.filter(item => item.humanRequired),
    };
  } catch {
    return createDemoState(withHistory);
  }
}

export async function regenerateBotMission(botId: string): Promise<MissionSlice> {
  const areaIndex = areaIndexForBot(botId);
  if (areaIndex < 0) {
    throw new Error(`Unknown bot id: ${botId}`);
  }

  const area = DEMO_AREAS[areaIndex];
  return missionToSlice(area, areaIndex, await requestMission(area));
}

export function replaceMissionInState(state: DemoState, mission: MissionSlice, autoStart = false): DemoState {
  const bot = autoStart && mission.bot.collection?.runs.length
    ? { ...mission.bot, missionStatus: "running" as const, status: "collecting" as const }
    : mission.bot;
  const humanItems = new Map((state.humanRequiredItems ?? []).map(item => [item.id, item]));
  for (const item of [...state.observations, ...mission.observations]) {
    if (item.humanRequired) humanItems.set(item.id, item);
  }
  return {
    ...state,
    bots: state.bots.map(current => current.id === bot.id ? bot : current),
    observations: [
      ...state.observations.filter(item => item.botId !== bot.id),
      ...mission.observations,
    ],
    humanRequiredItems: [...humanItems.values()],
  };
}

export function advanceSimulation(state: DemoState, seconds: number): DemoState {
  let observations = state.observations;
  const bots = state.bots.map((bot): RobotState => {
    if (bot.missionStatus !== "running" || bot.route.source === "unverified-preview") return bot;
    const collection = bot.collection;
    const activeIds = collection ? new Set(collection.runs[collection.runIndex]?.pickupOrderIds ?? []) : null;
    // Preserve the demo's 18% battery cost per scan, rather than per load.
    const batteryCost = 18 / Math.max(1, collection?.runs.length ?? 1);
    const availableDistance = bot.batteryPct / batteryCost * bot.route.distanceM;
    const delta = Math.min(bot.route.distanceM / 40 * Math.max(0, seconds), availableDistance);
    const traveledM = Math.min(bot.route.distanceM, bot.distanceM + delta);
    const batteryPct = Math.max(0, bot.batteryPct - (bot.route.distanceM ? (traveledM - bot.distanceM) / bot.route.distanceM * batteryCost : 0));
    const { position } = routePosition(bot.route, traveledM);
    const complete = traveledM >= bot.route.distanceM;

    observations = observations.map(item => {
      if (item.botId !== bot.id || item.humanRequired || (activeIds && !activeIds.has(item.id)) || item.stopDistanceM > traveledM) return item;
      return item.status === "collected" ? item : { ...item, status: "collected" };
    });
    const payloadKg = observations.filter(item => item.botId === bot.id && item.status === "collected" && (!activeIds || activeIds.has(item.id)))
      .reduce((sum, item) => sum + item.massKg, 0);

    if (complete && collection) {
      const nextIndex = collection.runIndex + 1;
      const next = collection.runs[nextIndex];
      // Return/unload is instantaneous in this simulation; collected history remains.
      if (next) {
        observations = observations.map(item => {
          if (item.botId !== bot.id) return item;
          const stopIndex = next.pickupOrderIds.indexOf(item.id);
          return { ...item, stopDistanceM: stopIndex >= 0 ? next.route.stopDistancesM[stopIndex] : Infinity };
        });
        return {
          ...bot, longitude: collection.start[0], latitude: collection.start[1],
          route: next.route, distanceM: 0, payloadKg: 0, batteryPct,
          collection: { ...collection, runIndex: nextIndex },
          missionStatus: batteryPct <= 0 ? "paused" : "running",
          status: batteryPct <= 0 ? "low-battery" : "collecting",
        };
      }
      return {
        ...bot, longitude: collection.start[0], latitude: collection.start[1],
        distanceM: traveledM, payloadKg: 0, batteryPct,
        missionStatus: "complete", status: "complete",
      };
    }
    return { ...bot, payloadKg, batteryPct, distanceM: traveledM, longitude: position[0], latitude: position[1],
      missionStatus: complete ? "complete" : batteryPct <= 0 ? "paused" : "running",
      status: complete ? "complete" : batteryPct <= 0 ? "low-battery" : "collecting",
    };
  });
  return { ...state, bots, observations };
}
