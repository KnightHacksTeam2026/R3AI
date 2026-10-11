import { SAMPLE_PATHS } from "./sampleRouteGeometry";
import type { Coordinate } from "../command/types";
import { distanceM } from "../command/routeGeometry";

export type CleanupRoute = {
  id: string;
  name: string;
  area: string;
  description: string;
  category: "Park" | "Waterfront" | "Neighborhood";
  coordinates: Coordinate[];
  sample: boolean;
};

// Sample cleanup listings along mapped pedestrian ways, not verified waste reports.
export const SAMPLE_ROUTES: CleanupRoute[] = [
  { id: "sample-eola", name: "A little love for Lake Eola", area: "Lake Eola Park, Orlando", category: "Park", sample: true, description: "A lakeside cleanup idea with room to slow down. Follows a mapped Lake Eola footpath segment. Check current signage and access when you arrive.", coordinates: SAMPLE_PATHS.eola.coordinates },
  { id: "sample-ivanhoe", name: "The lakeside reset", area: "Lake Ivanhoe, Orlando", category: "Waterfront", sample: true, description: "An idea for a short cleanup by the water. Follows a mapped section of the Gaston Edwards Trail; this is not turn-by-turn guidance. Use accessible public paths and leave hazardous items for trained crews.", coordinates: SAMPLE_PATHS.ivanhoe.coordinates },
  { id: "sample-thornton", name: "A kinder neighborhood", area: "Thornton Park, Orlando", category: "Neighborhood", sample: true, description: "Make a little time for the streets around you. Follows a mapped sidewalk segment in Thornton Park. Current access has not been verified. Follow local signage and public sidewalks.", coordinates: SAMPLE_PATHS.thornton.coordinates },
];

export const DEFAULT_CENTER: Coordinate = [-81.372, 28.544];
export const NEARBY_RADIUS_M = 5000;

export function routeLength(route: CleanupRoute) {
  return route.coordinates.slice(1).reduce((total, point, index) => total + distanceM(route.coordinates[index], point), 0);
}

export function distanceToStart(route: CleanupRoute, center: Coordinate) {
  return distanceM(center, route.coordinates[0]);
}

export function isCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === "number" && Number.isFinite(item)) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

// Validate external feeds before rendering their content or geometry.
export function parseRouteFeed(data: unknown): CleanupRoute[] {
  if (!Array.isArray(data) || data.length > 500) throw new Error("Invalid route feed");
  const ids = new Set<string>();
  return data.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid route");
    const route = item as Record<string, unknown>;
    for (const key of ["id", "name", "area", "description"] as const) {
      if (typeof route[key] !== "string" || !route[key].trim() || route[key].length > (key === "description" ? 2000 : 160)) throw new Error("Invalid route text");
    }
    if (ids.has(route.id as string) || !["Park", "Waterfront", "Neighborhood"].includes(route.category as string) || typeof route.sample !== "boolean" || !Array.isArray(route.coordinates) || route.coordinates.length < 2 || route.coordinates.length > 10000 || !route.coordinates.every(isCoordinate)) throw new Error("Invalid route geometry");
    ids.add(route.id as string);
    return { id: route.id, name: route.name, area: route.area, description: route.description, category: route.category, coordinates: route.coordinates, sample: route.sample } as CleanupRoute;
  });
}
