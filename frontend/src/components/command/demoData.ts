import { STREET_ROUTES } from "./streetRoutes";
import { routeFromLegs, routePosition } from "./routeGeometry";
import type { Coordinate, RobotState, WasteObservation } from "./types";

// All robot missions are locally generated synthetic data for the demo.
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

const DEFAULT_CAPACITY_KG = 20;
const DEFAULT_BATTERY_PCT = 96;
let missionSequence = 0;

type DemoArea = typeof DEMO_AREAS[number];
type MissionSlice = { bot: RobotState; observations: WasteObservation[] };

type RouteSource = RobotState["route"]["source"];

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

function areaGeometry(area: DemoArea) {
  const start = area.center as Coordinate;
  const street = STREET_ROUTES[area.id];
  const preview: Coordinate[] = [
    start,
    [start[0] + 0.002, start[1]],
    [start[0] + 0.002, start[1] + 0.002],
    [start[0], start[1] + 0.002],
  ];
  const points = street?.waypoints ?? preview;
  const legs = street ? street.legs : buildLegsFromRoute(points);
  return {
    start,
    routeSource: street ? "street-snapshot" as RouteSource : "unverified-preview" as RouteSource,
    stopPoints: legs.map((leg) => leg.at(-1) as Coordinate),
  };
}

function buildSyntheticObservation(area: DemoArea, botId: string, itemId: string, categoryIndex: number, point: Coordinate, massScale: number, itemCount: number, humanRequired: boolean): WasteObservation {
  const category = CATEGORIES[categoryIndex % CATEGORIES.length];
  return {
    id: itemId,
    botId,
    area: area.name,
    category: category.name,
    longitude: point[0],
    latitude: point[1],
    massKg: Number((itemCount * category.itemMass * massScale).toFixed(2)),
    itemCount,
    density: itemCount < 18 ? "sparse" : itemCount < 36 ? "moderate" : "dense",
    confidence: null,
    source: "synthetic",
    stopDistanceM: Infinity,
    status: "mapped",
    humanRequired,
    dimensions: humanRequired ? [18, 18, 5] : [3, 3, 2],
  };
}

function createSyntheticMissionSlice(area: DemoArea, areaIndex: number, withHistory: boolean, missionSeed: number): MissionSlice {
  const { start, routeSource, stopPoints } = areaGeometry(area);
  const botId = `R3-${area.id}-G01`;
  const collectableCount = 5 + ((areaIndex + missionSeed) % 4);
  const humanRequiredCount = (areaIndex + missionSeed) % 2;
  const runCount = Math.max(1, Math.min(3, Math.ceil(collectableCount / 3)));
  const runBuckets = Array.from({ length: runCount }, () => [] as WasteObservation[]);
  const collectableItems: WasteObservation[] = [];

  for (let index = 0; index < collectableCount; index++) {
    const stop = stopPoints[(missionSeed + index) % stopPoints.length];
    const offsetPoint: Coordinate = [
      Number((stop[0] + (seededFraction(missionSeed * 17 + index) - 0.5) * 0.0012).toFixed(6)),
      Number((stop[1] + (seededFraction(missionSeed * 29 + index) - 0.5) * 0.0012).toFixed(6)),
    ];
    const item = buildSyntheticObservation(
      area,
      botId,
      `SYN-${area.id}-${missionSeed.toString().padStart(3, "0")}-C${(index + 1).toString().padStart(2, "0")}`,
      areaIndex + missionSeed + index,
      offsetPoint,
      1,
      8 + Math.floor(seededFraction(missionSeed * 11 + index) * 28),
      false,
    );
    collectableItems.push(item);
    runBuckets[index % runCount].push(item);
  }

  const humanRequiredItems = Array.from({ length: humanRequiredCount }, (_, index) => {
    const stop = stopPoints[(missionSeed + collectableCount + index) % stopPoints.length];
    const offsetPoint: Coordinate = [
      Number((stop[0] + (seededFraction(missionSeed * 41 + index) - 0.5) * 0.0015).toFixed(6)),
      Number((stop[1] + (seededFraction(missionSeed * 53 + index) - 0.5) * 0.0015).toFixed(6)),
    ];
    return buildSyntheticObservation(
      area,
      botId,
      `SYN-${area.id}-${missionSeed.toString().padStart(3, "0")}-H${(index + 1).toString().padStart(2, "0")}`,
      areaIndex + missionSeed + collectableCount + index,
      offsetPoint,
      1.2,
      10 + Math.floor(seededFraction(missionSeed * 67 + index) * 22),
      true,
    );
  });

  const runs = runBuckets.filter((bucket) => bucket.length).map((bucket) => {
    const route = routeFromLegs(buildLegsFromRoute([start, ...bucket.map((item) => [item.longitude, item.latitude] as Coordinate)]), routeSource);
    bucket.forEach((item, stopIndex) => {
      item.stopDistanceM = route.stopDistancesM[stopIndex] ?? route.distanceM;
    });
    return { route, pickupOrderIds: bucket.map((item) => item.id) };
  });

  const route = runs[0]?.route ?? routeFromLegs([[start, start]], routeSource);
  let distanceM = 0;
  let batteryPct = DEFAULT_BATTERY_PCT - areaIndex * 5;
  let payloadKg = 0;
  let missionStatus: RobotState["missionStatus"] = "ready";
  let status: RobotState["status"] = routeSource === "unverified-preview" ? "route-unavailable" : "standby";
  let longitude = start[0];
  let latitude = start[1];

  if (withHistory && route.source !== "unverified-preview") {
    distanceM = route.distanceM * (0.2 + seededFraction(missionSeed * 73 + areaIndex) * 0.25);
    batteryPct -= route.distanceM ? distanceM / route.distanceM * 18 : 0;
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

  const observations = [...collectableItems, ...humanRequiredItems];
  return {
    bot: {
      id: botId,
      type: "ground",
      area: area.name,
      longitude,
      latitude,
      capacityKg: DEFAULT_CAPACITY_KG,
      initialBatteryPct: DEFAULT_BATTERY_PCT - areaIndex * 5,
      batteryPct,
      payloadKg: Number(payloadKg.toFixed(2)),
      status,
      route,
      distanceM,
      missionStatus,
      missionIssue: collectableItems.length ? undefined : "human-only",
      collection: { start, runs, runIndex: 0 },
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
    // Preserve the demo's 18% battery cost per scan, rather than per load.
    const batteryCost = 18 / Math.max(1, collection?.runs.length ?? 1);
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
      // Return/unload is instantaneous in this simulation; collected history remains.
      if (next) {
        observations = observations.map((item) => {
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
