/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses the CommonJS TypeScript loader. */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};
const { regenerateBotMission, replaceMissionInState, advanceSimulation } = require('../src/components/command/demoData.ts');
const { imageClassificationMeasurement } = require('../src/components/command/detectionMetrics.ts');
const { routeCircleEntryDistance, routeFromLegs } = require('../src/components/command/routeGeometry.ts');

function response(decisions = [true, false, true, false, true, false, true, false, true, false]) {
  const scanResults = decisions.map((trashDetected, index) => ({
    candidateIndex: index + 1,
    image: `${trashDetected ? 'trash' : 'empty'}-${index}.jpeg`,
    trashDetected,
    detectedCount: trashDetected ? 1 : 0,
    labels: trashDetected ? ['bottle'] : [],
    confidence: trashDetected ? 0.8 + index / 100 : null,
    modelId: 'Ultralytics/YOLO26/yolo26n.pt',
    knownTrash: index !== 0,
    expectedCount: index === 0 ? 0 : 1,
    expectedKind: index === 0 ? 'unspecified' : 'bottle',
  }));
  return {
    botId: 'R3-ORL-G01',
    areaId: 'ORL',
    scanResults,
    scanSummary: {
      scanned: scanResults.length,
      trashDetected: decisions.filter(Boolean).length,
      rejected: decisions.filter(value => !value).length,
    },
  };
}

async function load(t, payload = response(), autoStart = true) {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => payload }));
  const mission = await regenerateBotMission('R3-ORL-G01');
  return replaceMissionInState({ bots: [mission.bot], observations: [] }, mission, autoStart);
}

test('only R3-YOLO true scans are stored as observations and pickup stops', async t => {
  const payload = response();
  const state = await load(t, payload);
  const positiveImages = new Set(payload.scanResults.filter(scan => scan.trashDetected).map(scan => scan.image));
  const pickupIds = new Set(state.bots[0].collection.runs.flatMap(run => run.pickupOrderIds));

  assert.equal(state.observations.length, 5);
  assert.deepEqual(state.bots[0].collection.scanStats, {
    scanned: 10,
    trashDetected: 5,
    rejected: 5,
    modelId: 'Ultralytics/YOLO26/yolo26n.pt',
  });
  assert.equal(state.bots[0].collection.scanFrames.length, 10);
  assert.equal(new Set(state.bots[0].collection.scanFrames.map(frame => frame.image)).size, 10);
  assert.equal(state.bots[0].collection.scanFrames.filter(frame => frame.trashDetected).length, 5);
  assert.equal(state.bots[0].collection.scanFrames.filter(frame => !frame.trashDetected).length, 5);
  assert.equal(state.bots[0].collection.scanFrames.filter(frame => frame.knownTrash).length, 9);
  assert.ok(state.observations.every(item => item.source === 'ai-inference'));
  assert.ok(state.observations.every(item => positiveImages.has(item.sampleImage)));
  assert.ok(state.observations.every(item => item.confidence !== null));
  assert.deepEqual(pickupIds, new Set(state.observations.map(item => item.id)));
  assert.ok(state.observations.every(item => !item.sampleImage.startsWith('empty-')));
});

test('scan completes before the bot returns to collect the stored positives', async t => {
  let state = await load(t);
  state = advanceSimulation(state, 28);
  assert.equal(state.bots[0].collection.phase, 'collecting');
  assert.ok(state.observations.every(item => item.discovered));
  assert.ok(state.observations.every(item => item.status === 'mapped'));

  for (let index = 0; index < state.bots[0].collection.runs.length; index++) {
    state = advanceSimulation(state, 40);
  }
  assert.equal(state.bots[0].missionStatus, 'complete');
  assert.equal(state.bots[0].payloadKg, 0);
  assert.ok(state.observations.every(item => item.status === 'collected'));
});

test('scan frames and positive discoveries advance together at circle entries', async t => {
  let state = await load(t);
  const bot = state.bots[0];
  const frames = [...bot.collection.scanFrames].sort((left, right) => left.scanDistanceM - right.scanDistanceM);
  const targetDistance = frames[2].scanDistanceM + 0.1;
  state = advanceSimulation(state, targetDistance / bot.route.distanceM * 28);
  const scanned = frames.filter(frame => frame.scanDistanceM <= state.bots[0].distanceM);
  assert.ok(scanned.length >= 3);
  assert.equal(state.observations.filter(item => item.discovered).length, scanned.filter(frame => frame.trashDetected).length);
});

test('all-false scan creates no observations or collection route', async t => {
  let state = await load(t, response(Array(10).fill(false)));
  assert.equal(state.observations.length, 0);
  assert.equal(state.bots[0].collection.runs.length, 0);
  assert.deepEqual(state.bots[0].collection.scanStats, {
    scanned: 10,
    trashDetected: 0,
    rejected: 10,
    modelId: 'Ultralytics/YOLO26/yolo26n.pt',
  });
  state = advanceSimulation(state, 28);
  assert.equal(state.bots[0].missionStatus, 'complete');
});

test('paused bots neither reveal detections nor advance', async t => {
  const state = await load(t);
  state.bots[0].missionStatus = 'paused';
  assert.deepEqual(advanceSimulation(state, 100), state);
});

test('a failed detector request is reported to the caller', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 500 }));
  await assert.rejects(() => regenerateBotMission('R3-ORL-G01'), /R3-YOLO scan failed/);
});

test('circle entry distance fires at the radius boundary, not by route percentage', () => {
  const route = routeFromLegs([[[-81.001, 28], [-80.999, 28]]], 'street-snapshot');
  const entry = routeCircleEntryDistance(route, [-81, 28], 30);
  assert.ok(entry > 60 && entry < 80, `expected circle entry near 68 m, received ${entry}`);
  assert.ok(entry < route.distanceM / 2, 'entry must occur before reaching the circle center');
});

test('detection measurement compares YOLO trash images with developer-known image labels', () => {
  const measurement = imageClassificationMeasurement([
    { knownTrash: true, trashDetected: true },
    { knownTrash: true, trashDetected: false },
    { knownTrash: false, trashDetected: false },
    { knownTrash: null, trashDetected: true },
  ]);

  assert.equal(measurement.evaluatedImages, 3);
  assert.equal(measurement.knownTrashImages, 2);
  assert.equal(measurement.predictedTrashImages, 1);
  assert.equal(measurement.matchingImages, 2);
  assert.equal(Math.round(measurement.accuracyPercent), 67);
  assert.equal(measurement.imageGap, -1);
});

test('image agreement handles correct negatives and unprocessed labels', () => {
  assert.equal(imageClassificationMeasurement([{ knownTrash: false, trashDetected: false }]).accuracyPercent, 100);
  assert.equal(imageClassificationMeasurement([{ knownTrash: false, trashDetected: true }]).accuracyPercent, 0);
  assert.equal(imageClassificationMeasurement([{ knownTrash: null, trashDetected: true }]).accuracyPercent, null);
});
