const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const wind = {clb: [[0, 270, 60], [100, 270, 60]], des: [[0, 270, 60], [100, 270, 60]], enr: [{pos: [0, 0], lv: [[340, 0, 100]]}]};
const state = {active: {legs: [{id: 'AAAA'}, {k: 'dest', id: 'BBBB'}]}, phase: 'TAKEOFF'};
const randomMath = Object.create(Math);
randomMath.random = () => 0.5;
const ctx = {
  window: {}, Math: randomMath, D2R: Math.PI / 180, S: state,
  P: {CLBW: {lsk() {}}, CRZW: {lsk() {}}, DESW: {lsk() {}}},
  DB: {apt: {AAAA: {pos: [0, 0]}, BBBB: {pos: [10, 10]}, CCCC: {pos: [20, 20]}, DDDD: {pos: [30, 30]}, EEEE: {pos: [40, 40]}, FFFF: {pos: [50, 50]}}},
  OFPS: [{flt: 'FIRST', from: 'AAAA', to: 'BBBB', wind}, {flt: 'SECOND', from: 'CCCC', to: 'DDDD', wind}],
  idxK: (plan, kind) => plan.legs.findIndex(leg => leg.k === kind),
  I: () => ({flt: ''}), gc: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'wx.js'), 'utf8'), ctx);
const {WX, windAt, crabOf} = ctx.window.__wx;

for (const [from, to, pos, phase] of [
  ['AAAA', 'BBBB', [0, 0], 'TAKEOFF'], ['AAAA', 'BBBB', [10, 10], 'APPR'],
  ['CCCC', 'DDDD', [20, 20], 'TAKEOFF'], ['CCCC', 'DDDD', [30, 30], 'APPR'],
]) {
  state.active.legs = [{id: from}, {k: 'dest', id: to}];
  const low = windAt(pos, 3500, 500, phase);
  assert.equal(low.spd, 11);
  assert.equal(low.dir, 180);
  assert.notEqual(crabOf(90, 150, low).hdg, 90);
  for (const aal of [0, 1499, 1500]) {
    const w = windAt(pos, 3000 + aal, aal, phase);
    assert.equal(w.spd, low.spd, `${from}: wind at ${aal} ft AAL`);
    assert.equal(w.dir, low.dir, `${from}: direction at ${aal} ft AAL`);
  }
  assert.ok(Math.abs(windAt(pos, 5250, 2250, phase).spd - Math.hypot(30, 5.5)) < 1e-9);
  assert.ok(Math.abs(windAt(pos, 6000, 3000, phase).spd - 60) < 1e-9);
}

state.active.legs = [{id: 'EEEE'}, {k: 'dest', id: 'FFFF'}];
assert.equal(windAt([40, 40], 3500, 500, 'TO').spd, 11, 'surface wind without an OFP');
assert.equal(windAt([40, 40], 6000, 3000, 'TO').spd, 0, 'calm aloft without an OFP');
WX.frozenWind = {dir: 270, spd: 60};
assert.equal(windAt([40, 40], 6000, 3000, 'DES').spd, 60, 'diversion keeps the previous in-flight wind');
assert.equal(windAt([40, 40], 4500, 1500, 'APPR').spd, 11, 'new destination keeps the low-altitude surface rule');
assert.ok(Math.abs(windAt([40, 40], 5250, 2250, 'APPR').spd - Math.hypot(30, 5.5)) < 1e-9,
  'wind blends from the new airport surface wind to the frozen wind');
state.active.legs = [{id: 'CCCC'}, {k: 'dest', id: 'DDDD'}];
assert.equal(windAt([20, 20], 6000, 3000, 'CLB').spd, 60, 'a later route change does not replace the frozen wind');
WX.on = false;
assert.equal(windAt([20, 20], 6000, 3000, 'CLB').spd, 0, 'the wind-off control still works');
WX.on = true;
WX.frozenWind = null;
WX.surface = {};
randomMath.random = () => 0.25;
state.active.legs = [{id: 'EEEE'}, {k: 'dest', id: 'FFFF'}];
assert.equal(windAt([40, 40], 3500, 500, 'TO').spd, 7, 'new flight gets a fresh surface wind');
WX.on = false;
assert.equal(windAt([40, 40], 3500, 500, 'TO').spd, 0);
console.log('Stable surface wind below 20 kt and gradual transition: passed');
