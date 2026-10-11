/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses the CommonJS TypeScript loader. */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

// Load the existing TypeScript simulation with the project's compiler, no test dependencies.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { regenerateBotMission, replaceMissionInState, advanceSimulation } = require('../src/components/command/demoData.ts');

function response(prefix = '') {
  const start = [-81.3755, 28.5422];
  const items = Array.from({ length: 10 }, (_, index) => ({
    id: `${prefix}trash-${index}`, category: 'Mixed litter',
    longitude: start[0] + (index + 1) * 0.001, latitude: start[1],
    xDim: 2, yDim: 2, zDim: 2, weightKg: 2, itemCount: 1,
    density: 'sparse', area: 'Orlando', pickupRank: index < 8 ? index + 1 : null,
    stored: index < 8,
  }));
  const runs = Array.from({ length: 4 }, (_, index) => {
    const load = items.slice(index * 2, index * 2 + 2);
    return { pickupOrderIds: load.map(item => item.id),
      routeCoordinates: [start, ...load.map(item => [item.longitude, item.latitude])] };
  });
  return {
    botId: 'R3-ORL-G01', areaId: 'ORL', areaName: 'Orlando',
    startLongitude: start[0], startLatitude: start[1], items, runs,
    humanRequiredItemIds: items.slice(8).map(item => item.id),
    robotState: { weightCapacityKg: 4 },
  };
}

async function load(t, payload = response()) {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => payload }));
  const mission = await regenerateBotMission('R3-ORL-G01');
  return replaceMissionInState({ bots: [mission.bot], observations: [] }, mission, true);
}

test('four loads collect the same eight items, unload, and retain two human items', async t => {
  let state = await load(t);
  const ids = state.observations.map(item => item.id);
  const home = [-81.3755, 28.5422];
  state = advanceSimulation(state, 30);
  assert.ok(state.bots[0].payloadKg > 0);
  assert.ok(state.bots[0].payloadKg <= 4);
  state = advanceSimulation(state, 10);
  for (let run = 1; run <= 4; run++) {
    const bot = state.bots[0];
    assert.equal(bot.payloadKg, 0);
    assert.deepEqual([bot.longitude, bot.latitude], home);
    assert.equal(state.observations.filter(item => item.status === 'collected').length, run * 2);
    assert.deepEqual(state.observations.map(item => item.id), ids);
    assert.equal(bot.missionStatus, run < 4 ? 'running' : 'complete');
    if (run < 4) {
      assert.equal(bot.collection.runIndex, run);
      state = advanceSimulation(state, 40);
    }
  }
  assert.ok(state.bots[0].batteryPct > 0);
  assert.equal(state.humanRequiredItems.length, 2);
  assert.ok(state.observations.filter(item => item.humanRequired).every(item => item.status === 'mapped'));
  assert.equal(globalThis.fetch.mock.callCount(), 1);
  const nextMission = await regenerateBotMission('R3-ORL-G01');
  const next = replaceMissionInState(state, nextMission, true);
  assert.equal(next.bots[0].missionStatus, 'running');
  assert.equal(next.humanRequiredItems.length, 2);
});

test('paused bots neither collect nor advance loads', async t => {
  let state = await load(t);
  state.bots[0].missionStatus = 'paused';
  const next = advanceSimulation(state, 100);
  assert.deepEqual(next, state);
});

test('all impossible scan terminates without collecting or auto-starting', async t => {
  const payload = response();
  payload.runs = [];
  payload.humanRequiredItemIds = payload.items.map(item => item.id);
  let state = await load(t, payload);
  assert.equal(state.bots[0].missionStatus, 'ready');
  state.bots[0].missionStatus = 'running';
  state = advanceSimulation(state, 1);
  assert.equal(state.bots[0].missionStatus, 'complete');
  assert.equal(state.bots[0].payloadKg, 0);
  assert.ok(state.observations.every(item => item.status === 'mapped'));
});

test('human-required archive survives a new scan with distinct IDs', async t => {
  let payload = response();
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => payload }));
  const first = await regenerateBotMission('R3-ORL-G01');
  let state = replaceMissionInState({ bots: [first.bot], observations: [] }, first);
  payload = response('new-');
  const second = await regenerateBotMission('R3-ORL-G01');
  state = replaceMissionInState(state, second, true);
  assert.equal(state.humanRequiredItems.length, 4);
  assert.equal(state.observations.length, 10);
  assert.ok(state.observations.every(item => item.id.startsWith('new-')));
});

test('zero-distance pickups complete without looping', async t => {
  const payload = response();
  payload.runs.forEach(run => { run.routeCoordinates = run.routeCoordinates.map(() => [-81.3755, 28.5422]); });
  let state = await load(t, payload);
  for (let index = 0; index < 4; index++) state = advanceSimulation(state, 1);
  assert.equal(state.bots[0].missionStatus, 'complete');
  assert.equal(state.observations.filter(item => item.status === 'collected').length, 8);
});
