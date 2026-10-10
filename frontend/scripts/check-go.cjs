/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../src/components");
const previous = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  if (!filename.startsWith(root + path.sep)) throw new Error("Unexpected module");
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  module._compile(result.outputText, filename);
};
try {
  const { parseRouteFeed, SAMPLE_ROUTES, distanceToStart, DEFAULT_CENTER, NEARBY_RADIUS_M, routeLength } = require("../src/components/go/cleanupRoutes.ts");
  const { readSession, EMPTY_SESSION } = require("../src/components/go/demoData.ts");
  assert.deepEqual(parseRouteFeed([]), []);
  assert.deepEqual(parseRouteFeed(SAMPLE_ROUTES), SAMPLE_ROUTES);
  assert(SAMPLE_ROUTES.every(route => route.sample && routeLength(route) > 0));
  assert(SAMPLE_ROUTES.every(route => distanceToStart(route, DEFAULT_CENTER) < NEARBY_RADIUS_M));
  assert(SAMPLE_ROUTES.every(route => distanceToStart(route, [-74.006, 40.7128]) > NEARBY_RADIUS_M));
  const route = SAMPLE_ROUTES[0];
  for (const bad of [null, {}, [null], [route, route], Array(501).fill(route), [{ ...route, coordinates: [[181, 0], [0, 0]] }], [{ ...route, coordinates: [[0, NaN], [0, 0]] }], [{ ...route, coordinates: [[0, 0]] }], [{ ...route, coordinates: [[0, 0, 1], [1, 1]] }], [{ ...route, coordinates: Array(10001).fill([0, 0]) }], [{ ...route, name: "" }], [{ ...route, description: "a".repeat(2001) }], [{ ...route, sample: "false" }], [{ ...route, category: "Road" }]]) assert.throws(() => parseRouteFeed(bad));
  assert.deepEqual(readSession(null), EMPTY_SESSION);
  const session = { ...EMPTY_SESSION, entries: [{ id: "test", missionId: null, category: "Plastic", count: 7, note: "Park cleanup", createdAt: "2026-10-10T12:00:00Z" }] };
  assert.deepEqual(readSession(JSON.stringify(session)), session);
  assert.throws(() => readSession(JSON.stringify({ ...session, entries: [{ ...session.entries[0], count: -1 }] })));
  console.log("PASS: route feed validation, geographic filtering, sample labeling, route distances, and cleanup log persistence.");
} finally { require.extensions[".ts"] = previous; }
