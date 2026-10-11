import { STREET_ROUTES } from "./streetRoutes";
import { routeCircleEntryDistance, routeFromLegs, routePosition } from "./routeGeometry";
import { coverageRadiusM } from "./coverageGeometry";
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
  "Plastic packaging",
  "Mixed paper",
  "Glass bottles",
  "Aluminum cans",
  "Mixed litter",
] as const;

const DEFAULT_CAPACITY_KG = 160;
const DEFAULT_DIMENSIONS: [number, number, number] = [24, 18, 8];
const DEFAULT_BATTERY_PCT = 98;
const MAX_PICKUPS_PER_RUN = 6;
const SCAN_BATTERY_COST = 6;
const COLLECTION_BATTERY_COST = 12;
const SCAN_DURATION_SECONDS = 28;
const PICKUP_DURATION_SECONDS = 40;
let missionSequence = 0;

type DemoArea = typeof DEMO_AREAS[number];
type MissionSlice = { bot: RobotState; observations: WasteObservation[] };
type YoloScanResult = {
  candidateIndex: number;
  image: string;
  trashDetected: boolean;
  detectedCount: number;
  labels: string[];
  confidence: number | null;
  modelId: string;
  knownTrash: boolean | null;
  expectedCount: number | null;
  expectedKind: string | null;
};
type YoloScanResponse = {
  botId: string;
  areaId: string;
  scanResults: YoloScanResult[];
  scanSummary: { scanned: number; trashDetected: number; rejected: number };
};
type RouteSource = RobotState["route"]["source"];
type GeneratedObservation = WasteObservation & { accessIndex: number };
type PlannedRun = { route: RobotState["route"]; pickupOrderIds: string[] };
type RoadGeometry = {
  start: Coordinate;
  routeSource: RouteSource;
  roadPath: Coordinate[];
  scanRoute: RobotState["route"];
  scanDistanceByIndex: number[];
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
  const outboundRoute = routeFromLegs(buildLegsFromRoute(roadPath), street ? "street-snapshot" : "unverified-preview");
  const loopPath = roadPath.length > 1 ? [...roadPath, ...roadPath.slice(0, -1).reverse()] : roadPath;
  return {
    start,
    routeSource: street ? "street-snapshot" : "unverified-preview",
    roadPath,
    scanRoute: routeFromLegs(buildLegsFromRoute(loopPath), street ? "street-snapshot" : "unverified-preview"),
    scanDistanceByIndex: [0, ...outboundRoute.stopDistancesM],
  };
}

function sampleRoadIndices(pathLength: number, count: number, missionSeed: number) {
  const lastIndex = Math.max(1, pathLength - 1);
  const firstUsable = Math.min(4, lastIndex);
  const span = Math.max(1, lastIndex - firstUsable);
  const indices = Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / (count + 1);
    const jitter = (seededFraction(missionSeed * 13 + index) - 0.5) * 0.1;
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

function buildSyntheticObservation(area: DemoArea, botId: string, itemId: string, categoryIndex: number, point: Coordinate, itemCount: number, massKg: number, dimensions: [number, number, number], humanRequired: boolean, accessIndex: number, scanDistanceM: number): GeneratedObservation {
  return {
    id: itemId,
    botId,
    area: area.name,
    category: CATEGORIES[categoryIndex % CATEGORIES.length],
    longitude: point[0],
    latitude: point[1],
    massKg: Number(massKg.toFixed(2)),
    itemCount,
    density: itemCount < 18 ? "sparse" : itemCount < 36 ? "moderate" : "dense",
    confidence: null,
    source: "synthetic",
    stopDistanceM: Infinity,
    scanDistanceM,
    discovered: false,
    status: "mapped",
    humanRequired,
    dimensions,
    accessIndex,
  };
}

function routeSegment(path: Coordinate[], fromIndex: number, toIndex: number) {
  const start = Math.max(0, Math.min(fromIndex, path.length - 1));
  const end = Math.max(0, Math.min(toIndex, path.length - 1));
  if (start === end) return [path[start]];
  return start < end ? path.slice(start, end + 1) : [...path.slice(end, start + 1)].reverse();
}

function planCollectionRuns(items: GeneratedObservation[], geometry: RoadGeometry) {
  let remaining = [...items].sort((a, b) => a.accessIndex - b.accessIndex);
  const runs: PlannedRun[] = [];

  while (remaining.length) {
    const load: GeneratedObservation[] = [];
    const deferred: GeneratedObservation[] = [];
    let totalMass = 0;

    for (const item of remaining) {
      const fitsCount = load.length < MAX_PICKUPS_PER_RUN;
      const fitsWeight = totalMass + item.massKg <= DEFAULT_CAPACITY_KG;
      if (fitsCount && fitsWeight) {
        load.push(item);
        totalMass += item.massKg;
      } else {
        deferred.push(item);
      }
    }

    if (!load.length) {
      return { runs, leftover: deferred };
    }

    let previousIndex = 0;
    const route = routeFromLegs(load.map((item) => {
      const leg = routeSegment(geometry.roadPath, previousIndex, item.accessIndex);
      previousIndex = item.accessIndex;
      return leg;
    }), geometry.routeSource);

    load.forEach((item, stopIndex) => {
      item.stopDistanceM = route.stopDistancesM[stopIndex] ?? route.distanceM;
    });
    runs.push({ route, pickupOrderIds: load.map((item) => item.id) });
    remaining = deferred;
  }

  return { runs, leftover: [] as GeneratedObservation[] };
}

function createSyntheticMissionSlice(area: DemoArea, areaIndex: number, withHistory: boolean, missionSeed: number, scanResults?: YoloScanResult[]): MissionSlice {
  const geometry = areaGeometry(area);
  const botId = `R3-${area.id}-G01`;
  const collectableCount = scanResults?.length ?? 10 + ((areaIndex + missionSeed) % 5);
  const oversizedCount = scanResults ? 0 : 1 + ((areaIndex + missionSeed) % 2);
  const collectableIndices = sampleRoadIndices(geometry.roadPath.length, collectableCount, missionSeed);
  const oversizedIndices = sampleRoadIndices(geometry.roadPath.length, oversizedCount, missionSeed * 3 + 1);

  const candidateObservations = collectableIndices.map((accessIndex, index) => {
    const scan = scanResults?.[index];
    const accessPoint = geometry.roadPath[accessIndex] ?? geometry.start;
    const dimensions: [number, number, number] = [
      7 + Math.floor(seededFraction(missionSeed * 19 + index) * 5),
      6 + Math.floor(seededFraction(missionSeed * 23 + index) * 4),
      3 + Math.floor(seededFraction(missionSeed * 29 + index) * 3),
    ];
    const observation = buildSyntheticObservation(
      area,
      botId,
      `SYN-${area.id}-${missionSeed.toString().padStart(3, "0")}-C${(index + 1).toString().padStart(2, "0")}`,
      areaIndex + missionSeed + index,
      observationPoint(accessPoint, missionSeed, index),
      18 + Math.floor(seededFraction(missionSeed * 11 + index) * 28),
      16 + seededFraction(missionSeed * 37 + index) * 18,
      dimensions,
      false,
      accessIndex,
      0,
    );
    observation.scanDistanceM = routeCircleEntryDistance(
      geometry.scanRoute,
      [observation.longitude, observation.latitude],
      coverageRadiusM(observation.density),
    );
    if (!scan) return observation;
    return {
      ...observation,
      category: scan.labels.length ? scan.labels.map(label => label[0].toUpperCase() + label.slice(1)).join(" / ") : "Detected trash",
      itemCount: scan.detectedCount,
      confidence: scan.confidence,
      source: "ai-inference" as const,
      sampleImage: scan.image,
      detectedCount: scan.detectedCount,
      detectorModel: scan.modelId,
    };
  }).sort((a, b) => a.accessIndex - b.accessIndex);
  const collectableCandidates = candidateObservations.filter((_, index) => scanResults?.[index]?.trashDetected ?? true);

  const oversizedItems = oversizedIndices.map((accessIndex, index) => {
    const accessPoint = geometry.roadPath[accessIndex] ?? geometry.start;
    const dimensions: [number, number, number] = [
      DEFAULT_DIMENSIONS[0] + 4 + index,
      DEFAULT_DIMENSIONS[1] + 2,
      DEFAULT_DIMENSIONS[2] + 1,
    ];
    return buildSyntheticObservation(
      area,
      botId,
      `SYN-${area.id}-${missionSeed.toString().padStart(3, "0")}-H${(index + 1).toString().padStart(2, "0")}`,
      areaIndex + missionSeed + collectableCount + index,
      observationPoint(accessPoint, missionSeed * 5, index),
      20 + Math.floor(seededFraction(missionSeed * 67 + index) * 16),
      28 + seededFraction(missionSeed * 71 + index) * 18,
      dimensions,
      true,
      accessIndex,
      geometry.scanDistanceByIndex[accessIndex] ?? geometry.scanRoute.distanceM,
    );
  });

  const planned = planCollectionRuns(collectableCandidates, geometry);
  const runs = planned.runs;
  const humanRequiredItems = [...oversizedItems, ...planned.leftover.map((item) => ({ ...item, humanRequired: true, stopDistanceM: Infinity }))];

  let route = geometry.scanRoute;
  let distanceM = 0;
  let batteryPct = DEFAULT_BATTERY_PCT - areaIndex * 4;
  let payloadKg = 0;
  let missionStatus: RobotState["missionStatus"] = "ready";
  let status: RobotState["status"] = geometry.routeSource === "unverified-preview" ? "route-unavailable" : "standby";
  let phase: "scanning" | "collecting" = "scanning";
  let longitude = geometry.start[0];
  let latitude = geometry.start[1];

  const allObservations: GeneratedObservation[] = [...collectableCandidates, ...humanRequiredItems];

  if (withHistory && route.source !== "unverified-preview") {
    const scanProgress = Math.min(geometry.scanRoute.distanceM, geometry.scanRoute.distanceM * 0.55);
    batteryPct -= geometry.scanRoute.distanceM ? scanProgress / geometry.scanRoute.distanceM * SCAN_BATTERY_COST : 0;
    allObservations.forEach((item) => {
      if (item.scanDistanceM <= scanProgress) item.discovered = true;
    });
    if (scanProgress >= geometry.scanRoute.distanceM * 0.99 && runs[0]) {
      phase = "collecting";
      route = runs[0].route;
      distanceM = route.distanceM * 0.3;
      missionStatus = "paused";
      status = "paused";
      const { position } = routePosition(route, distanceM);
      longitude = position[0];
      latitude = position[1];
      batteryPct -= route.distanceM ? distanceM / route.distanceM * (COLLECTION_BATTERY_COST / Math.max(1, runs.length)) : 0;
      allObservations.forEach((item) => { item.discovered = true; });
      collectableCandidates.forEach((item) => {
        if (item.stopDistanceM <= distanceM) {
          item.status = "collected";
          payloadKg += item.massKg;
        }
      });
    } else {
      distanceM = scanProgress;
      missionStatus = "paused";
      status = "paused";
      const { position } = routePosition(route, distanceM);
      longitude = position[0];
      latitude = position[1];
    }
  }

  const observations: WasteObservation[] = allObservations.map((item) => ({ ...item }));
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
      batteryPct: Number(batteryPct.toFixed(2)),
      payloadKg: Number(payloadKg.toFixed(2)),
      status,
      route,
      distanceM,
      missionStatus,
      missionIssue: !runs.length && humanRequiredItems.length ? "human-only" : undefined,
      collection: {
        phase,
        start: geometry.start,
        scanRoute: geometry.scanRoute,
        runs,
        runIndex: 0,
        scanStats: scanResults ? {
          scanned: scanResults.length,
          trashDetected: collectableCandidates.length,
          rejected: scanResults.length - collectableCandidates.length,
          modelId: scanResults[0]?.modelId,
        } : undefined,
        scanFrames: scanResults?.map((scan, index) => ({
          candidateIndex: scan.candidateIndex,
          image: scan.image,
          trashDetected: scan.trashDetected,
          detectedCount: scan.detectedCount,
          labels: scan.labels,
          confidence: scan.confidence,
          scanDistanceM: candidateObservations[index]?.scanDistanceM ?? geometry.scanRoute.distanceM,
          longitude: candidateObservations[index]?.longitude ?? geometry.start[0],
          latitude: candidateObservations[index]?.latitude ?? geometry.start[1],
          radiusM: candidateObservations[index] ? coverageRadiusM(candidateObservations[index].density) : 30,
          knownTrash: scan.knownTrash,
          expectedCount: scan.expectedCount,
          expectedKind: scan.expectedKind,
        })),
      },
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
  const baseSeed = nextMissionSeed() * 100;
  try {
    const slices = await Promise.all(DEMO_AREAS.map(async (area, areaIndex) =>
      createSyntheticMissionSlice(area, areaIndex, false, baseSeed + areaIndex + 1, (await requestYoloScan(area)).scanResults)));
    const observations = slices.flatMap(slice => slice.observations);
    return {
      bots: slices.map(slice => slice.bot),
      observations,
      humanRequiredItems: observations.filter(item => item.humanRequired),
    };
  } catch {
    return buildDemoState(false, baseSeed);
  }
}

export async function regenerateBotMission(botId: string): Promise<MissionSlice> {
  const areaIndex = areaIndexForBot(botId);
  if (areaIndex < 0) {
    throw new Error(`Unknown bot id: ${botId}`);
  }
  const area = DEMO_AREAS[areaIndex];
  const response = await requestYoloScan(area);
  return createSyntheticMissionSlice(area, areaIndex, false, nextMissionSeed() * 100 + areaIndex, response.scanResults);
}

async function requestYoloScan(area: DemoArea): Promise<YoloScanResponse> {
  const response = await fetch("/api/command/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      detectionOnly: true,
      areaId: area.id,
      areaName: area.name,
      botId: `R3-${area.id}-G01`,
    }),
  });
  if (!response.ok) throw new Error(`R3-YOLO scan failed with status ${response.status}`);
  return response.json() as Promise<YoloScanResponse>;
}

export function replaceMissionInState(state: DemoState, mission: MissionSlice, autoStart = false): DemoState {
  const collection = mission.bot.collection;
  const bot = autoStart && collection
    ? {
        ...mission.bot,
        missionStatus: "running" as const,
        status: (collection.phase === "scanning" ? "scanning" : "collecting") as RobotState["status"],
      }
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
    if (!collection) return bot;

    const scanning = collection.phase === "scanning";
    const batteryCost = scanning ? SCAN_BATTERY_COST : COLLECTION_BATTERY_COST / Math.max(1, collection.runs.length);
    const duration = scanning ? SCAN_DURATION_SECONDS : PICKUP_DURATION_SECONDS;
    const availableDistance = bot.batteryPct / batteryCost * bot.route.distanceM;
    const delta = Math.min(bot.route.distanceM / duration * Math.max(0, seconds), availableDistance);
    const traveledM = Math.min(bot.route.distanceM, bot.distanceM + delta);
    const batteryPct = Math.max(0, bot.batteryPct - (bot.route.distanceM ? (traveledM - bot.distanceM) / bot.route.distanceM * batteryCost : 0));
    const { position } = routePosition(bot.route, traveledM);
    const complete = traveledM >= bot.route.distanceM;

    if (scanning) {
      observations = observations.map((item) => {
        if (item.botId !== bot.id || item.discovered || item.scanDistanceM > traveledM) return item;
        return { ...item, discovered: true };
      });

      if (complete) {
        observations = observations.map((item) => item.botId === bot.id ? { ...item, discovered: true } : item);
        const next = collection.runs[0];
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
            collection: { ...collection, phase: "collecting", runIndex: 0 },
            missionStatus: batteryPct <= 0 ? "paused" : "running",
            status: batteryPct <= 0 ? "low-battery" : "collecting",
          };
        }
        return {
          ...bot,
          longitude: collection.start[0],
          latitude: collection.start[1],
          batteryPct,
          missionStatus: "complete",
          status: "complete",
        };
      }

      return {
        ...bot,
        batteryPct,
        distanceM: traveledM,
        longitude: position[0],
        latitude: position[1],
        missionStatus: batteryPct <= 0 ? "paused" : "running",
        status: batteryPct <= 0 ? "low-battery" : "scanning",
      };
    }

    const activeIds = new Set(collection.runs[collection.runIndex]?.pickupOrderIds ?? []);
    observations = observations.map((item) => {
      if (item.botId !== bot.id || item.humanRequired || !activeIds.has(item.id) || item.stopDistanceM > traveledM) return item;
      return item.status === "collected" ? item : { ...item, status: "collected" };
    });
    const payloadKg = observations
      .filter((item) => item.botId === bot.id && item.status === "collected" && activeIds.has(item.id))
      .reduce((sum, item) => sum + item.massKg, 0);

    if (complete) {
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
      missionStatus: batteryPct <= 0 ? "paused" : "running",
      status: batteryPct <= 0 ? "low-battery" : "collecting",
    };
  });
  return { ...state, bots, observations };
}
