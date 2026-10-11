// Run: node scripts/check-command.cjs. Uses the project's existing TypeScript
// dependency to load pure simulation modules; no browser or new test runner.
/* eslint-disable @typescript-eslint/no-require-imports -- This Node-only checker deliberately uses the CommonJS loader hook. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const commandDirectory = path.resolve(__dirname, "../src/components/command");
const previousLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  if (!filename.startsWith(commandDirectory + path.sep)) {
    if (previousLoader) return previousLoader(module, filename);
    throw new Error("Only Command simulation modules are supported by this check.");
  }
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(compiled.outputText, filename);
};

try {
  const { createDemoState, advanceSimulation } = require("../src/components/command/demoData.ts");
  const { routePosition, routeFromLegs, distanceM } = require("../src/components/command/routeGeometry.ts");
  const { cleanupCoverage } = require("../src/components/command/coverageGeometry.ts");
  let state = createDemoState(false);
  const { parsePlaces, botsForPlace } = require("../src/components/command/placeSearch.ts");
  const countries = parsePlaces({ features: [{ properties: { name: "United States", type: "country", countrycode: "US", osm_type: "R", osm_id: 1, extent: [-125, 50, -66, 24] }, geometry: { coordinates: [-100, 40] } }] });
  assert.deepEqual(countries[0].bounds, [[-125, 24], [-66, 50]]);
  assert.equal(botsForPlace(countries[0], state.bots).length, 2);
  assert.equal(botsForPlace({ ...countries[0], countryCode: "FR" }, state.bots).length, 0);
  assert.equal(botsForPlace({ ...countries[0], kind: "city", center: [-0.1246, 51.5086] }, state.bots).length, 1);
  assert.deepEqual(parsePlaces({ features: [{ geometry: { coordinates: [999, 999] }, properties: { name: "Bad", type: "city" } }] }), []);
  assert.throws(() => parsePlaces({}), /Invalid place response/);
  assert(state.bots.every(bot => bot.type === "ground"));
  const coverage = cleanupCoverage(state.observations, state.bots[0].id);
  assert.equal(coverage.features.length, 0, "Undiscovered scan candidates must stay hidden");
  const visibleCoverage = cleanupCoverage(state.observations.map(item => ({ ...item, discovered: true })), state.bots[0].id);
  assert(visibleCoverage.features.every(feature => feature.properties.botId === state.bots[0].id && !feature.properties.cleaned));
  for (const feature of visibleCoverage.features) {
    const ring = feature.geometry.coordinates[0];
    assert.deepEqual(ring[0], ring.at(-1), "Coverage rings must be closed");
    assert.equal(feature.geometry.type, "Polygon");
    assert.equal(feature.properties.id, undefined, "Coverage must not expose individual observation IDs");
  }
  assert.equal(state.bots.length, 8);
  assert(state.observations.length > 24);
  assert.equal(new Set(state.bots.map(bot => bot.area)).size, 8);
  assert(new Set(state.observations.map(item => item.density)).size >= 2);
  assert.deepEqual(state, createDemoState(false), "Demo generation must be deterministic");

  for (const bot of state.bots) {
    assert(bot.route.distanceM > 0);
    assert(bot.route.stopDistancesM.length > 3);
    assert.equal(bot.route.source, "street-snapshot");
    assert(bot.route.coordinates.length > 4, "Ground geometry must include actual street vertices");
    for (const fraction of [0, 0.1, 0.5, 1]) {
      const result = routePosition(bot.route, bot.route.distanceM * fraction);
      const length = result.traveled.slice(1).reduce((sum, point, index) => sum + distanceM(result.traveled[index], point), 0);
      assert(Math.abs(length - bot.route.distanceM * fraction) < 0.01, "Position and traveled geometry must agree");
    }
  }

  state = { ...state, bots: state.bots.map((bot, index) => index === 0 ? { ...bot, missionStatus: "running" } : bot) };
  state = advanceSimulation(state, 4);
  assert(state.bots[0].distanceM > 0);
  assert(state.bots[0].batteryPct < state.bots[0].initialBatteryPct);
  assert(state.bots.slice(1).every(bot => bot.batteryPct === bot.initialBatteryPct), "Idle bots must not drain battery");
  assert(state.bots.slice(1).every(bot => bot.distanceM === 0), "Unselected idle missions must not move");
  assert(state.observations.filter(item => item.botId === state.bots[0].id).every(item => item.status === "mapped"), "Scanning must not collect trash");

  state = { ...state, bots: state.bots.map(bot => ({ ...bot, missionStatus: "running" })) };
  for (let tick = 0; tick < 900; tick++) state = advanceSimulation(state, 0.2);
  for (const bot of state.bots) {
    assert.equal(bot.missionStatus, "complete");
    assert.equal(bot.distanceM, bot.route.distanceM);
    assert(bot.payloadKg <= bot.capacityKg);
    const items = state.observations.filter(item => item.botId === bot.id);
    assert(items.filter(item => !item.humanRequired).every(item => item.status === "collected"));
    assert(items.filter(item => item.humanRequired).every(item => item.status === "mapped"));
    assert(items.every(item => item.confidence === null && item.source === "synthetic"));
    assert(bot.batteryPct >= 0 && bot.batteryPct <= 100);
    assert(Math.abs(bot.batteryPct - (bot.initialBatteryPct - 18)) < 0.001);
  }
  assert(cleanupCoverage(state.observations, state.bots[0].id).features.some(feature => feature.properties.cleaned));
  const emptyBattery = createDemoState(false);
  emptyBattery.bots[0] = { ...emptyBattery.bots[0], batteryPct: 0, missionStatus: "running" };
  const stopped = advanceSimulation(emptyBattery, 1).bots[0];
  assert.equal(stopped.distanceM, 0);
  assert.equal(stopped.missionStatus, "paused");
  assert.equal(stopped.status, "low-battery");
  const paused = { ...state, bots: state.bots.map(bot => ({ ...bot, missionStatus: "paused" })) };
  assert.deepEqual(advanceSimulation(paused, 1), paused);
  const unavailable = { ...state, bots: state.bots.map(bot => ({ ...bot, missionStatus: "running", distanceM: 0, route: routeFromLegs([[[0, 0], [1, 1]]], "unverified-preview") })) };
  assert(advanceSimulation(unavailable, 40).bots.every(bot => bot.distanceM === 0), "Unverified ground previews must not animate");
  console.log("Command checks passed: global data, street geometry, movement, arrivals, independent missions, pause, capacity, selected-bot coverage, battery and fallback.");
} finally {
  if (previousLoader) require.extensions[".ts"] = previousLoader;
  else delete require.extensions[".ts"];
}
