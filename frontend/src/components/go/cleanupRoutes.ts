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

// Illustrative paths only. These are not surveyed trails or verified waste reports.
export const SAMPLE_ROUTES: CleanupRoute[] = [
  { id: "sample-eola", name: "A little love for Lake Eola", area: "Lake Eola Park, Orlando", category: "Park", sample: true, description: "A lakeside cleanup idea with room to slow down. This sample path is approximate; follow signed public paths and check access when you arrive.", coordinates: [[-81.3737,28.5432],[-81.3729,28.5427],[-81.3718,28.5425],[-81.3706,28.5429],[-81.3698,28.5437],[-81.3696,28.5447],[-81.3702,28.5455],[-81.3714,28.5458],[-81.3726,28.5456],[-81.3735,28.5448],[-81.3737,28.5432]] },
  { id: "sample-ivanhoe", name: "The lakeside reset", area: "Lake Ivanhoe, Orlando", category: "Waterfront", sample: true, description: "An idea for a short cleanup by the water. The sample line is illustrative, not walking directions. Use accessible public paths and leave hazardous items for trained crews.", coordinates: [[-81.3781,28.5651],[-81.3782,28.5658],[-81.3786,28.5665],[-81.3793,28.5671],[-81.3803,28.5675],[-81.3814,28.5677]] },
  { id: "sample-thornton", name: "A kinder neighborhood", area: "Thornton Park, Orlando", category: "Neighborhood", sample: true, description: "Make a little time for the streets around you. This sample route has not been checked for pedestrian access. Follow local signage and public sidewalks.", coordinates: [[-81.3685,28.5423],[-81.3673,28.5423],[-81.3662,28.5423],[-81.3662,28.5409],[-81.3674,28.5409]] },
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
