import { STREET_ROUTES } from "./streetRoutes";
import { routeFromLegs, routePosition } from "./routeGeometry";
import type { Coordinate, RobotState, WasteObservation } from "./types";

// All command missions are synthetic, but movement stays constrained to known road snapshots.
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

const DEFAULT_CAPACITY_KG = 160;
const DEFAULT_DIMENSIONS: [number, number, number] = [24, 18, 8];
const DEFAULT_BATTERY_PCT = 98;
const MAX_PICKUPS_PER_RUN = 6;
let missionSequence = 0;

type DemoArea = typeof DEMO_AREAS[number];
type MissionSlice = { bot: RobotState; observations: WasteObservation[] };
type RouteSource = RobotState["route"]["source"];
type GeneratedObservation = WasteObservation & { accessIndex: number };
type RoadGeometry = {
  start: Coordinate;
  routeSource: RouteSource;
  roadPath: Coordinate[];
  scanRoute: ReturnType<typeof routeFromLegs>;
};

export type DemoState = {
  bots: RobotState[];
  observations: WasteObservation[];
  humanRequiredItems?: WasteObservation[];
};

function seededFraction(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function nextMissionSeed() {
  missionSequence += 1;
  return missionSequence;
}

function buildLegsFromRoute(points: Coordinate[]): Coordinate[][] {
  if (points.length === 0) return [];
  if (points.length === 1) return [[points[0], points[0]]];
  return points.slice(1).map((point, index) => [points[index], point]);
}

function flattenLegs(legs: Coordinate[][]) {
  const path: Coordinate[] = [];
  for (const leg of legs) {
    for (const point of leg) {
      const previous = path.at(-1);
      if (previous && previous[0] === point[0] && previous[1] === point[1]) continue;
      path.push(point);
    }
  }
  return path;
}

function areaGeometry(area: DemoArea): RoadGeometry {
  const fallback: Coordinate[] = [
    area.center as Coordinate,
    [area.center[0] + 0.0018, area.center[1]],
    [area.center[0] + 0.0018, area.center[1] + 0.0018],
    [area.center[0], area.center[1] + 0.0018],
  ];
  const street = STREET_ROUTES[area.id];
  const legs = street?.legs ?? buildLegsFromRoute(fallback);
  const roadPath = flattenLegs(legs);
  const start = roadPath[0] ?? (area.center as Coordinate);
  return {
    start,
    routeSource: street ? "street-snapshot" : "unverified-preview",
    roadPath,
    scanRoute: routeFromLegs(legs, street ? "street-snapshot" : "unverified-preview"),
  };
}

function sampleRoadIndices(pathLength: number, count: number, missionSeed: number) {
  const lastIndex = Math.max(1, pathLength - 1);
  const firstUsable = Math.min(4, lastIndex);
  const span = Math.max(1, lastIndex - firstUsable);
  const indices = Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / (count + 1);
    const jitter = (seededFraction(missionSeed * 13 + index) - 0.5) * 0.12;
    const scaled = Math.min(0.98, Math.max(0.02, fraction + jitter));
    return Math.min(lastIndex, Math.max(firstUsable, Math.round(firstUsable + span * scaled)));
  });
  return [...new Set(indices)].sort((a, b) => a - b);
}

function observationPoint(accessPoint: Coordinate, missionSeed: number, index: number): Coordinate {
  const offsetLng = (seededFraction(missionSeed * 31 + index) - 0.5) * 0.00028;
  const offsetLat = (seededFraction(missionSeed * 47 + index) - 0.5) * 0.00028;
  return [
    Number((accessPoint[0] + offsetLng).toFixed(6)),
    Number((accessPoint[1] + offsetLat).toFixed(6)),
  ];
}

function buildSyntheticObservation(area: DemoArea, botId: string, itemId: string, categoryIndex: number, point: Coordinate, itemCount: number, humanRequired: boolean, accessIndex: number): GeneratedObservation {
  const category = CATEGORIES[categoryIndex % CATEGORIES.length];
  return {
    id: itemId,
    botId,
    area: area.name,
    category: category.name,
    longitude: point[0],
    latitude: point[1],
    massKg: Number((itemCount * category.itemMass).toFixed(2)),
    itemCount,
    density: itemCount < 18 ? "sparse" : itemCount < 36 ? "moderate" : "dense",
    confidence: null,
    source: "synthetic",
    stopDistanceM: Infinity,
    status: "mapped",
    humanRequired,
    dimensions: humanRequired ? [28, 20, 10] : [6, 5, 3],
    accessIndex,
  };
}

function routeSegment(path: Coordinate[], fromIndex: number, toIndex: number) {
  const start = Math.max(0, Math.min(fromIndex, path.length - 1));
  const end = Math.max(0, Math.min(toIndex, path.length - 1));
  if (start === end) return [path[start]];
  return start < end ? path.slice(start, end + 1) : [...path.slice(end, start + 1)].reverse();
}

function createSyntheticMissionSlice(area: DemoArea, areaIndex: number, withHistory: boolean, missionSeed: number): MissionSlice {
  const geometry = areaGeometry(area);
  const botId = `R3-${area.id}-G01`;
  const collectableCount = 8 + ((areaIndex + missionSeed) % 5);
  const humanRequiredCount = (areaIndex + missionSeed) % 2;
  const collectableIndices = sampleRoadIndices(geometry.roadPath.length, collectableCount, missionSeed);
  const humanIndices = sampleRoadIndices(geometry.roadPath.length, humanRequiredCount, missionSeed * 3 + 1);

  const collectableItems = collectableIndices.map((accessIndex, index) => {
    const accessPoint = geometry.roadPath[accessIndex] ?? geometry.start;
    return buildSyntheticObservation(
      area,
      botId,
      `SYN-${area.id}-${missionSeed.toString().padStart(3, "0")}-C${(index + 1).toString().padStart(2, "0")}`,
      areaIndex + missionSeed + index,
      observationPoint(accessPoint, missionSeed, index),
      14 + Math.floor(seededFraction(missionSeed * 11 + index) * 26),
      false,
      accessIndex,
    );
  }).sort((a, b) => a.accessIndex - b.accessIndex);

  const humanRequiredItems = humanIndices.map((accessIndex, index) => {
    const accessPoint = geometry.roadPath[accessIndex] ?? geometry.start;
    return buildSyntheticObservation(
      area,
      botId,
      `SYN-${area.id}-${missionSeed.toString().padStart(3, "0")}-H${(index + 1).toString().padStart(2, "0")}`,
      areaIndex + missionSeed + collectableCount + index,
      observationPoint(accessPoint, missionSeed * 5, index),
      18 + Math.floor(seededFraction(missionSeed * 67 + index) * 18),
      true,
      accessIndex,
    );
  });

  const runs = Array.from({ length: Math.ceil(collectableItems.length / MAX_PICKUPS_PER_RUN) }, (_, runIndex) => {
    const bucket = collectableItems.slice(runIndex * MAX_PICKUPS_PER_RUN, (runIndex + 1) * MAX_PICKUPS_PER_RUN);
    let previousIndex = 0;
    const legs = bucket.map((item) => {
      const leg = routeSegment(geometry.roadPath, previousIndex, item.accessIndex);
      previousIndex = item.accessIndex;
      return leg;
    });
    const route = routeFromLegs(legs.length ? legs : [[geometry.start, geometry.start]], geometry.routeSource);
    bucket.forEach((item, stopIndex) => {
      item.stopDistanceM = route.stopDistancesM[stopIndex] ?? route.distanceM;
    });
    return { route, pickupOrderIds: bucket.map((item) => item.id) };
  }).filter((run) => run.pickupOrderIds.length > 0);

  const route = runs[0]?.route ?? geometry.scanRoute;
  let distanceM = 0;
  let batteryPct = DEFAULT_BATTERY_PCT - areaIndex * 4;
  let payloadKg = 0;
  let missionStatus: RobotState["missionStatus"] = "ready";
  let status: RobotState["status"] = geometry.routeSource === "unverified-preview" ? "route-unavailable" : "standby";
  let longitude = geometry.start[0];
  let latitude = geometry.start[1];

  if (withHistory && route.source !== "unverified-preview") {
    distanceM = route.distanceM * (0.15 + seededFraction(missionSeed * 73 + areaIndex) * 0.2);
    batteryPct -= route.distanceM ? distanceM / route.distanceM * 12 : 0;
    const { position } = routePosition(route, distanceM);
    longitude = position[0];
    latitude = position[1];
    missionStatus = "paused";
    status = "paused";
    for (const item of collectableItems) {
      if (item.stopDistanceM <= distanceM) {
        item.status = "collected";
        payloadKg += item.massKg;
      }
    }
  }

  const observations: WasteObservation[] = [...collectableItems, ...humanRequiredItems].map((item) => {
    const observation = { ...item } as WasteObservation;
    return observation;
  });
  return {
    bot: {
      id: botId,
      type: "ground",
      area: area.name,
      longitude,
      latitude,
      dimensions: DEFAULT_DIMENSIONS,
      capacityKg: DEFAULT_CAPACITY_KG,
      initialBatteryPct: DEFAULT_BATTERY_PCT - areaIndex * 4,
      batteryPct,
      payloadKg: Number(payloadKg.toFixed(2)),
      status,
      route,
      distanceM,
      missionStatus,
      missionIssue: collectableItems.length ? undefined : "human-only",
      collection: { start: geometry.start, runs, runIndex: 0 },
    },
    observations,
  };
}

function areaIndexForBot(botId: string): number {
  return DEMO_AREAS.findIndex((area) => botId.includes(`-${area.id}-`));
}

function buildDemoState(withHistory: boolean, baseSeed: number): DemoState {
  const slices = DEMO_AREAS.map((area, areaIndex) => createSyntheticMissionSlice(area, areaIndex, withHistory, baseSeed + areaIndex + 1));
  const observations = slices.flatMap((slice) => slice.observations);
  return {
    bots: slices.map((slice) => slice.bot),
    observations,
    humanRequiredItems: observations.filter((item) => item.humanRequired),
  };
}

export function createDemoState(withHistory = false): DemoState {
  return buildDemoState(withHistory, 1000);
}

export async function hydrateDemoState(): Promise<DemoState> {
  return buildDemoState(false, nextMissionSeed() * 100);
}

export async function regenerateBotMission(botId: string): Promise<MissionSlice> {
  const areaIndex = areaIndexForBot(botId);
  if (areaIndex < 0) {
    throw new Error(`Unknown bot id: ${botId}`);
  }
  return createSyntheticMissionSlice(DEMO_AREAS[areaIndex], areaIndex, false, nextMissionSeed() * 100 + areaIndex);
}

export function replaceMissionInState(state: DemoState, mission: MissionSlice, autoStart = false): DemoState {
  const bot = autoStart && mission.bot.collection?.runs.length
    ? { ...mission.bot, missionStatus: "running" as const, status: "collecting" as const }
    : mission.bot;
  const humanItems = new Map((state.humanRequiredItems ?? []).map((item) => [item.id, item]));
  for (const item of [...state.observations, ...mission.observations]) {
    if (item.humanRequired) humanItems.set(item.id, item);
  }
  return {
    ...state,
    bots: state.bots.map((current) => current.id === bot.id ? bot : current),
    observations: [
      ...state.observations.filter((item) => item.botId !== bot.id),
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
    const batteryCost = 12 / Math.max(1, collection?.runs.length ?? 1);
    const availableDistance = bot.batteryPct / batteryCost * bot.route.distanceM;
    const delta = Math.min(bot.route.distanceM / 40 * Math.max(0, seconds), availableDistance);
    const traveledM = Math.min(bot.route.distanceM, bot.distanceM + delta);
    const batteryPct = Math.max(0, bot.batteryPct - (bot.route.distanceM ? (traveledM - bot.distanceM) / bot.route.distanceM * batteryCost : 0));
    const { position } = routePosition(bot.route, traveledM);
    const complete = traveledM >= bot.route.distanceM;

    observations = observations.map((item) => {
      if (item.botId !== bot.id || item.humanRequired || (activeIds && !activeIds.has(item.id)) || item.stopDistanceM > traveledM) return item;
      return item.status === "collected" ? item : { ...item, status: "collected" };
    });
    const payloadKg = observations.filter((item) => item.botId === bot.id && item.status === "collected" && (!activeIds || activeIds.has(item.id)))
      .reduce((sum, item) => sum + item.massKg, 0);

    if (complete && collection) {
      const nextIndex = collection.runIndex + 1;
      const next = collection.runs[nextIndex];
      if (next) {
        observations = observations.map((item) => {
          if (item.botId !== bot.id) return item;
          const stopIndex = next.pickupOrderIds.indexOf(item.id);
          return { ...item, stopDistanceM: stopIndex >= 0 ? next.route.stopDistancesM[stopIndex] : Infinity };
        });
        return {
          ...bot,
          longitude: collection.start[0],
          latitude: collection.start[1],
          route: next.route,
          distanceM: 0,
          payloadKg: 0,
          batteryPct,
          collection: { ...collection, runIndex: nextIndex },
          missionStatus: batteryPct <= 0 ? "paused" : "running",
          status: batteryPct <= 0 ? "low-battery" : "collecting",
        };
      }
      return {
        ...bot,
        longitude: collection.start[0],
        latitude: collection.start[1],
        distanceM: traveledM,
        payloadKg: 0,
        batteryPct,
        missionStatus: "complete",
        status: "complete",
      };
    }

    return {
      ...bot,
      payloadKg,
      batteryPct,
      distanceM: traveledM,
      longitude: position[0],
      latitude: position[1],
      missionStatus: complete ? "complete" : batteryPct <= 0 ? "paused" : "running",
      status: complete ? "complete" : batteryPct <= 0 ? "low-battery" : "collecting",
    };
  });
  return { ...state, bots, observations };
}
