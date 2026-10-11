export type Theme = "light" | "dark";
export type MissionStatus = "ready" | "running" | "paused" | "complete";
export type Coordinate = [longitude: number, latitude: number];
export type WasteStatus = "mapped" | "collected";
export type WasteObservation = {
  id: string;
  category: string;
  longitude: number;
  latitude: number;
  massKg: number;
  confidence: number | null; // null means no real model inference
  status: WasteStatus;
  source: "synthetic" | "ai-inference";
  botId: string;
  area: string;
  itemCount: number;
  density: "sparse" | "moderate" | "dense";
  stopDistanceM: number;
  scanDistanceM: number;
  discovered: boolean;
  humanRequired?: boolean;
  dimensions?: [number, number, number];
};
export type BotRoute = {
  coordinates: Coordinate[];
  stopDistancesM: number[];
  distanceM: number;
  source: "street-snapshot" | "unverified-preview" | "osrm-trip";
};
export type RobotState = {
  id: string;
  type: "ground";
  area: string;
  longitude: number;
  latitude: number;
  dimensions: [number, number, number];
  capacityKg: number;
  payloadKg: number;
  initialBatteryPct: number;
  batteryPct: number;
  status: "standby" | "scanning" | "collecting" | "paused" | "complete" | "route-unavailable" | "low-battery";
  route: BotRoute;
  distanceM: number;
  missionStatus: MissionStatus;
  missionIssue?: "human-only";
  collection?: {
    phase: "scanning" | "collecting";
    start: Coordinate;
    scanRoute: BotRoute;
    runIndex: number;
    runs: { route: BotRoute; pickupOrderIds: string[] }[];
  };
};
