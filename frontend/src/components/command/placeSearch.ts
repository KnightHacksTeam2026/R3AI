import type { Coordinate, RobotState } from "./types";
import { distanceM } from "./routeGeometry";

export type PlaceResult = {
  id: string; name: string; description: string; kind: "city" | "country";
  center: Coordinate; countryCode: string;
  bounds?: [Coordinate, Coordinate];
};

// Assignment metadata for the synthetic fleet, not reverse-geocoded live telemetry.
const FLEET_COUNTRIES: Record<string, string> = {
  Orlando: "US", London: "GB", Barcelona: "ES", Nairobi: "KE",
  Tokyo: "JP", Sydney: "AU", "Rio de Janeiro": "BR", "San Francisco": "US",
};

export function botsForPlace(place: PlaceResult, bots: RobotState[]) {
  return bots.filter(bot => place.kind === "country"
    ? FLEET_COUNTRIES[bot.area] === place.countryCode
    : distanceM(place.center, [bot.longitude, bot.latitude]) <= 50000);
}

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
const label = (value: unknown) => typeof value === "string" ? value : "";
const coordinate = (value: unknown): value is Coordinate => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;

export function parsePlaces(data: unknown): PlaceResult[] {
  const features = object(data).features;
  if (!Array.isArray(features)) throw new Error("Invalid place response");
  const results: PlaceResult[] = [];
  for (const feature of features) {
    const item = object(feature), properties = object(item.properties);
    const center = object(item.geometry).coordinates;
    const kind = properties.type;
    const name = label(properties.name);
    if (!coordinate(center) || !name || (kind !== "city" && kind !== "country")) continue;
    const extent = properties.extent;
    let bounds: PlaceResult["bounds"];
    if (Array.isArray(extent) && extent.length === 4) {
      const sw = [extent[0], extent[3]], ne = [extent[2], extent[1]];
      if (coordinate(sw) && coordinate(ne) && sw[0] < ne[0] && sw[1] < ne[1]) bounds = [sw, ne];
    }
    const id = `${properties.osm_type}-${properties.osm_id}`;
    if (results.some(result => result.id === id)) continue;
    results.push({ id, name, kind, center, bounds, countryCode: label(properties.countrycode).toUpperCase(), description: [...new Set([label(properties.state), label(properties.country)].filter(part => part && part !== name))].join(", ") });
  }
  return results;
}

const cache = new Map<string, PlaceResult[]>();
export async function searchPlaces(query: string, signal: AbortSignal) {
  const key = query.trim().toLocaleLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;
  const url = new URL(process.env.NEXT_PUBLIC_GEOCODER_URL || "https://photon.komoot.io/api/");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  url.searchParams.append("layer", "city");
  url.searchParams.append("layer", "country");
  const response = await fetch(url, { signal, credentials: "omit" });
  if (!response.ok) throw new Error("Place search unavailable");
  const places = parsePlaces(await response.json());
  if (cache.size >= 30) cache.delete(cache.keys().next().value!);
  cache.set(key, places);
  return places;
}
