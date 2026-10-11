export type DemoMission = {
  id: string;
  name: string;
  area: string;
  description: string;
  duration: string;
  category: string;
};

// Suggested demo locations, not verified waste reports or live assignments.
export const DEMO_MISSIONS: DemoMission[] = [
  { id: "eola", name: "A little care for Lake Eola", area: "Lake Eola · Orlando", description: "Explore the park paths and log a small cleanup. Stay on public paths and leave hazardous items alone.", duration: "20–30 min", category: "Park paths" },
  { id: "river", name: "Restore the riverside", area: "Orlando · Demo area", description: "A demo mission for a walking-path cleanup. Confirm safe public access before starting.", duration: "15–20 min", category: "Walking paths" },
  { id: "local", name: "Start on your own street", area: "Your neighborhood", description: "Pick a safe public spot close to home. Small steps make a good place to start.", duration: "10–15 min", category: "Your own area" },
];

export const WASTE_CATEGORIES = ["Plastic", "Metal", "Paper & cardboard", "Glass", "Other"] as const;
export type WasteCategory = typeof WASTE_CATEGORIES[number];
export type CleanupEntry = {
  id: string;
  missionId: string | null;
  category: WasteCategory;
  count: number;
  note: string;
  createdAt: string;
};
export type GoSession = {
  activeMissionId: string | null;
  completedMissionIds: string[];
  entries: CleanupEntry[];
};
export const EMPTY_SESSION: GoSession = { activeMissionId: null, completedMissionIds: [], entries: [] };

export function readSession(value: string | null): GoSession {
  if (!value) return { ...EMPTY_SESSION };
  const data: unknown = JSON.parse(value);
  if (!data || typeof data !== "object") throw new Error("Invalid local log");
  const candidate = data as Partial<GoSession>;
  const validMission = (id: unknown): id is string => typeof id === "string" && DEMO_MISSIONS.some((mission) => mission.id === id);
  if (!(candidate.activeMissionId === null || validMission(candidate.activeMissionId)) ||
    !Array.isArray(candidate.completedMissionIds) || !candidate.completedMissionIds.every(validMission) ||
    !Array.isArray(candidate.entries) || !candidate.entries.every((entry) =>
      entry && typeof entry.id === "string" && (entry.missionId === null || validMission(entry.missionId)) &&
      WASTE_CATEGORIES.includes(entry.category) && Number.isInteger(entry.count) && entry.count > 0 && entry.count <= 999 &&
      typeof entry.note === "string" && typeof entry.createdAt === "string" && Number.isFinite(Date.parse(entry.createdAt)),
    )) throw new Error("Invalid local log");
  return candidate as GoSession;
}
