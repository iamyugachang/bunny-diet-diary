const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Core=require(fs.existsSync(path.join(__dirname,'../public/health-core.js'))?'../public/health-core.js':'../health-core.js');
test('monthly body changes use first/last measurements; missing values are not zero',()=>{
  assert.equal(typeof Core.monthSummary,'function','monthly summary missing');
  const state=Core.normalize({days:{
    '2026-10-01':{health:{weight:60,bodyFat:30,waterCups:5,bedTime:'23:30',wakeTime:'07:30',exerciseHours:0.5}},
    '2026-10-03':{health:{weight:59.5,bodyFat:29.8,waterCups:0,bedTime:'00:00',wakeTime:'07:00',exerciseHours:0}},
    '2026-10-07':{health:{weight:59,waterCups:null}},
    '2026-10-15':{health:{weight:20,waterCups:5}}
  }});
  const r=Core.monthSummary(state,'2026-10','2026-10-09');
  assert.equal(r.elapsed,9);assert.equal(r.recordedDays,3);assert.equal(r.missingDays,6);
  assert.equal(r.weight.delta,-1);assert.equal(r.weight.first.date,'2026-10-01');assert.equal(r.weight.last.date,'2026-10-07');
  assert.equal(r.bodyFat.delta,-0.2);assert.equal(r.water.measured,2);assert.equal(r.water.achieved,1);assert.equal(r.water.rate,50);assert.equal(r.water.missing,7);
  assert.equal(r.sleep.rate,50);assert.equal(r.exercise.count,1);assert.equal(r.exercise.hours,0.5);
});
test('one measurement insufficient; future month has zero elapsed and no fabricated success',()=>{
  const s=Core.normalize({days:{'2026-10-01':{health:{weight:60}}}});
  assert.equal(Core.monthSummary(s,'2026-10','2026-10-09').weight.delta,null);
  const r=Core.monthSummary(s,'2026-11','2026-10-09');assert.equal(r.elapsed,0);assert.equal(r.water.rate,null);assert.equal(r.exercise.weeklyRate,null);
});
test('exercise weekly rate uses completed recorded weeks, including cross-month Sundays; open week excluded',()=>{
  const s=Core.normalize({days:{
    '2026-09-28':{health:{exerciseHours:0.5}},'2026-10-01':{health:{exerciseHours:1}},'2026-10-03':{health:{exerciseHours:0.5}},
    '2026-10-05':{health:{exerciseHours:1}}
  }});
  const r=Core.monthSummary(s,'2026-10','2026-10-09');
  assert.equal(r.exercise.count,3);assert.equal(r.exercise.hours,2.5);
  assert.equal(r.exercise.closedRecordedWeeks,1);assert.equal(r.exercise.weeklyRate,100);
  assert.equal(r.weeks[0].start,'2026-09-28');assert.equal(r.weeks[1].complete,false);
});
test('month boundaries and leap years are correct',()=>{
  assert.equal(Core.monthSummary(Core.normalize({}),'2024-02','2024-03-01').elapsed,29);
  assert.equal(Core.monthSummary(Core.normalize({}),'2026-02','2026-03-01').elapsed,28);
  assert.equal(Core.nextMonth('2026-12'),'2027-01');
});
test('backup validation rejects malformed dates, executable photo URLs, bad shape and invalid nutrition numbers',()=>{
  assert.equal(typeof Core.validateBackup,'function','backup validation missing');
  assert.equal(Core.validateBackup({targets:{kcal:1270},days:{}}),true);
  assert.equal(Core.validateBackup({targets:{},days:{'2026-02-30':{}}}),false);
  assert.equal(Core.validateBackup({targets:{},days:[]}),false);
  assert.equal(Core.validateBackup({targets:{},days:{},photos:{p:'" onerror="alert(1)'}}),false);
  assert.equal(Core.validateBackup({targets:{kcal:-1},days:{}}),false);
  const badEntry={id:'e1\" onclick=\"alert(1)',name:'x',portions:{grains:1},kcal:70,c:15,p:2,f:0};
  assert.equal(Core.validateBackup({targets:{},days:{'2026-10-09':{me:{lunch:{entries:[badEntry],photos:[]}}}}}),false);
  assert.equal(Core.validateBackup({targets:{},days:{},photos:{'p1\" onclick=\"x':'data:image/png;base64,YWJj'}}),false);
});
