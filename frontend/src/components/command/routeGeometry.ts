import type { BotRoute, Coordinate } from "./types";

// Great-circle distances, not travel-time estimates. All movement is accelerated demo playback.
export function distanceM(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function routeFromLegs(legs: Coordinate[][], source: BotRoute["source"]): BotRoute {
  const coordinates: Coordinate[] = [];
  const stopDistancesM: number[] = [];
  let total = 0;
  for (const leg of legs) {
    for (const point of leg) {
      const previous = coordinates.at(-1);
      if (previous && point[0] === previous[0] && point[1] === previous[1]) continue;
      if (previous) total += distanceM(previous, point);
      coordinates.push(point);
    }
    stopDistancesM.push(total);
  }
  return { coordinates, stopDistancesM, distanceM: total, source };
}

export function routePosition(route: BotRoute, traveledM: number): { position: Coordinate; traveled: Coordinate[] } {
  const traveled: Coordinate[] = [route.coordinates[0]];
  let remaining = Math.max(0, traveledM);
  for (let index = 1; index < route.coordinates.length; index++) {
    const previous = route.coordinates[index - 1];
    const next = route.coordinates[index];
    const length = distanceM(previous, next);
    if (length > 0 && remaining < length) {
      const t = remaining / length;
      const position: Coordinate = [previous[0] + (next[0] - previous[0]) * t, previous[1] + (next[1] - previous[1]) * t];
      if (remaining > 0) traveled.push(position);
      return { position, traveled };
    }
    remaining -= length;
    traveled.push(next);
  }
  return { position: route.coordinates.at(-1)!, traveled };
}

// Distance traveled when a route first enters a geographic circle.
export function routeCircleEntryDistance(route: BotRoute, center: Coordinate, radiusM: number): number {
  const metersPerLongitude = 111320 * Math.cos(center[1] * Math.PI / 180);
  const local = (point: Coordinate): [number, number] => [
    (point[0] - center[0]) * metersPerLongitude,
    (point[1] - center[1]) * 111320,
  ];
  let traveled = 0;
  for (let index = 1; index < route.coordinates.length; index++) {
    const start = route.coordinates[index - 1];
    const end = route.coordinates[index];
    const segmentLength = distanceM(start, end);
    const [startX, startY] = local(start);
    if (startX * startX + startY * startY <= radiusM * radiusM) return traveled;

    const [endX, endY] = local(end);
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const a = deltaX * deltaX + deltaY * deltaY;
    const b = 2 * (startX * deltaX + startY * deltaY);
    const c = startX * startX + startY * startY - radiusM * radiusM;
    const discriminant = b * b - 4 * a * c;
    if (a > 0 && discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const entries = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
        .filter(value => value >= 0 && value <= 1)
        .sort((left, right) => left - right);
      if (entries.length) return traveled + segmentLength * entries[0];
    }
    traveled += segmentLength;
  }
  return route.distanceM;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}
