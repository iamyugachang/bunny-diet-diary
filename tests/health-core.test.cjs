const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const file = require('node:path').join(__dirname, '../public/health-core.js');
const deployedFile = require('node:path').join(__dirname, '../health-core.js');
const Core = fs.existsSync(file) ? require(file) : (fs.existsSync(deployedFile) ? require(deployedFile) : {});
const meals = () => ({breakfast:{entries:[],photos:[]}, lunch:{entries:[],photos:[]}, dinner:{entries:[],photos:[]}, snack:{entries:[],photos:[]}});
test('migration adds version2 fields without altering original meals/photos/targets or input', () => {
  const old={targets:{kcal:1400,protein:9}, days:{'2026-10-08':{me:meals(),note:'retain'}}, photos:{p1:'data:image/jpeg;base64,abc'}, recent:['f3'],lastExport:123};
  const before=JSON.stringify(old);
  assert.equal(typeof Core.normalize, 'function', 'version2 migration is missing');
  const next=Core.normalize(old);
  assert.equal(next.schemaVersion,2);
  assert.deepEqual(next.days,old.days);
  assert.deepEqual(next.photos,old.photos);
  assert.equal(next.targets.kcal,1400);
  assert.equal(next.healthTargets.sleepHours,8);
  assert.equal(next.healthTargets.exercisePerWeek,3);
  assert.equal(next.lastExport,123);
  assert.equal(JSON.stringify(old),before);
});

test('sleep correctly crosses midnight and leaves missing or invalid times unmeasured', () => {
  assert.equal(typeof Core.sleepHours,'function','sleep calculation missing');
  assert.equal(Core.sleepHours('23:30','07:30'),8);
  assert.equal(Core.sleepHours('01:00','08:00'),7);
  assert.equal(Core.sleepHours('22:00','22:00'),0);
  assert.equal(Core.sleepHours('','07:30'),null);
  assert.equal(Core.sleepHours('24:15','08:00'),null);
  assert.equal(Core.sleepHours('07:00','08:30'),1.5);
});
test('one-decimal form validation preserves blanks and rejects negatives/excess precision', () => {
  assert.equal(typeof Core.decimal,'function','decimal validation missing');
  assert.deepEqual(Core.decimal('',0,24),{ok:true,value:null});
  assert.deepEqual(Core.decimal('0.5',0,24),{ok:true,value:0.5});
  assert.equal(Core.decimal('1.',0,24).value,1);
  assert.equal(Core.decimal('-1',0,24).ok,false);
  assert.equal(Core.decimal('1.25',0,24).ok,false);
  assert.equal(Core.decimal('25',0,24).ok,false);
  assert.equal(Core.decimal('0',0.1,500).ok,false);
});
test('weekly exercise counts decimal-hour recorded days, not absent days or rests', () => {
  assert.equal(typeof Core.weekSummary,'function','weekly summary missing');
  const days={
    '2026-10-04':{health:{exerciseHours:2}},
    '2026-10-05':{health:{exerciseHours:0.5}},
    '2026-10-07':{health:{exerciseHours:1.5}},
    '2026-10-08':{health:{exerciseHours:0}},
    '2026-10-11':{health:{exerciseHours:2}}
  };
  const w=Core.weekSummary(days,'2026-10-09','2026-10-09',3);
  assert.equal(w.start,'2026-10-05');assert.equal(w.end,'2026-10-11');
  assert.equal(w.count,2);assert.equal(w.hours,2);assert.equal(w.recorded,3);assert.equal(w.missing,2);
  assert.equal(w.complete,false);assert.equal(w.target,3);
  const ended=Core.weekSummary(days,'2026-10-11','2026-10-12',3);
  assert.equal(ended.count,3);assert.equal(ended.complete,true);
});
