(function(root, factory){
  var api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.HealthCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  var DIET_DEFAULTS={protein:8,veg:4,grains:5,oil:6,fruit:0,dairy:0,kcal:1270,c:95,p:73,f:66};
  function normalize(input){
    var s=JSON.parse(JSON.stringify(input || {}));
    s.targets=Object.assign({},DIET_DEFAULTS,s.targets || {});
    s.days=s.days || {}; s.photos=s.photos || {}; s.recent=s.recent || [];
    s.healthTargets=Object.assign({sleepHours:8,exercisePerWeek:3},s.healthTargets || {});
    s.months=s.months || {}; s.schemaVersion=2;
    return s;
  }
  function decimal(raw,min,max){
    var text=String(raw == null ? '' : raw).trim();
    if(!text) return {ok:true,value:null};
    if(!/^\d+(?:\.\d?)?$/.test(text)) return {ok:false,value:null};
    var n=Number(text); return {ok:Number.isFinite(n)&&n>=min&&n<=max,value:n};
  }
  function sleepHours(bed,wake){
    var re=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if(!re.test(bed || '')||!re.test(wake || '')) return null;
    function mins(t){var a=t.split(':');return Number(a[0])*60+Number(a[1]);}
    return ((mins(wake)-mins(bed)+1440)%1440)/60;
  }
  function dayAdd(ds,n){
    var d=new Date(ds+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);
  }
  function weekStart(ds){var d=new Date(ds+'T12:00:00Z');return dayAdd(ds,-((d.getUTCDay()+6)%7));}
  function numberOrNull(value,min,max){return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;}
  function healthOf(day){
    var h=(day && day.health) || {};
    return {weight:numberOrNull(h.weight,0.1,500),bodyFat:numberOrNull(h.bodyFat,0,100),
      bedTime:typeof h.bedTime==='string'?h.bedTime:'',wakeTime:typeof h.wakeTime==='string'?h.wakeTime:'',
      waterCups:Number.isInteger(h.waterCups)&&h.waterCups>=0&&h.waterCups<=5?h.waterCups:null,
      exerciseHours:numberOrNull(h.exerciseHours,0,24),
      exerciseTypes:Array.isArray(h.exerciseTypes)?h.exerciseTypes.filter(function(t){return t==='有氧'||t==='重訓';}):[],
      exerciseItem:typeof h.exerciseItem==='string'?h.exerciseItem:'',status:['green','yellow','red'].includes(h.status)?h.status:'',
      tags:Array.isArray(h.tags)?h.tags.filter(function(t){return typeof t==='string';}):[]};
  }
  function weekSummary(days,date,asOf,target){
    var start=weekStart(date),end=dayAdd(start,6),count=0,hours=0,recorded=0,elapsed=0;
    for(var i=0;i<7;i++){
      var ds=dayAdd(start,i);if(ds>asOf) continue;elapsed++;
      var h=healthOf(days[ds]);if(h.exerciseHours===null) continue;
      recorded++;hours+=h.exerciseHours;if(h.exerciseHours>0)count++;
    }
    return {start:start,end:end,count:count,hours:Math.round(hours*10)/10,recorded:recorded,missing:elapsed-recorded,elapsed:elapsed,target:target || 3,complete:end<=asOf};
  }
  function nextMonth(month){return dayAdd(month+'-01',32).slice(0,7);}
  function validDate(ds){return /^\d{4}-\d{2}-\d{2}$/.test(ds) && !isNaN(Date.parse(ds)) && new Date(ds+'T12:00:00Z').toISOString().slice(0,10)===ds;}
  function plain(x){return x && typeof x==='object' && !Array.isArray(x);}
  function safeId(x){return typeof x==='string' && /^[a-zA-Z0-9_-]+$/.test(x);}
  function validateBackup(s){
    if(!plain(s)||!plain(s.targets)||!plain(s.days))return false;
    if(s.healthTargets && (!plain(s.healthTargets)||!Number.isFinite(s.healthTargets.sleepHours)||s.healthTargets.sleepHours<1||s.healthTargets.sleepHours>24||!Number.isInteger(s.healthTargets.exercisePerWeek)||s.healthTargets.exercisePerWeek<1||s.healthTargets.exercisePerWeek>7))return false;
    if(s.months && (!plain(s.months)||Object.keys(s.months).some(function(k){var m=s.months[k];return !/^\d{4}-(0[1-9]|1[0-2])$/.test(k)||!plain(m)||['plan','reward'].some(function(f){return m[f]!=null&&typeof m[f]!=='string';});})))return false;
    if(s.recent && (!Array.isArray(s.recent)||s.recent.some(function(v){return typeof v!=='string';})))return false;
    if(Object.keys(s.targets).some(function(k){return typeof s.targets[k]!=='number'||!Number.isFinite(s.targets[k])||s.targets[k]<0;}))return false;
    if(s.photos && (!plain(s.photos)||Object.keys(s.photos).some(function(k){var v=s.photos[k];return !safeId(k)||typeof v!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(v);})))return false;
    return Object.keys(s.days).every(function(ds){
      var d=s.days[ds];if(!validDate(ds)||!plain(d))return false;
      if(d.health && !plain(d.health))return false;
      if(d.me && (!plain(d.me)||!Object.values(d.me).every(function(m){
        return plain(m)&&Array.isArray(m.entries)&&Array.isArray(m.photos)&&m.photos.every(safeId)&&m.entries.every(function(e){
          return plain(e)&&typeof e.name==='string'&&safeId(e.id)&&plain(e.portions)&&['kcal','c','p','f'].every(function(k){return Number.isFinite(e[k])&&e[k]>=0;})&&Object.keys(e.portions).every(function(k){return ['protein','veg','grains','oil','fruit','dairy'].includes(k)&&Number.isFinite(e.portions[k])&&e.portions[k]>=0;});
        });
      })))return false;
      return true;
    });
  }
  function monthSummary(state,month,asOf){
    var first=month+'-01',last=dayAdd(nextMonth(month)+'-01',-1),end=asOf<last?asOf:last;
    var dates=[],recordedDays=0,weights=[],fats=[],water={measured:0,achieved:0},sleep={measured:0,achieved:0};
    var exercise={count:0,hours:0,recorded:0,closedRecordedWeeks:0,missingClosedWeeks:0,weeklyRate:null},statuses={green:0,yellow:0,red:0};
    var target=state.healthTargets || {sleepHours:8,exercisePerWeek:3};
    for(var ds=first;ds<=end;ds=dayAdd(ds,1)){
      dates.push(ds);var day=state.days[ds],h=healthOf(day);
      var hasHealth=h.weight!==null||h.bodyFat!==null||h.bedTime||h.wakeTime||h.waterCups!==null||h.exerciseHours!==null||h.status||h.tags.length||h.exerciseTypes.length||h.exerciseItem;
      var hasMeals=day&&day.me&&Object.values(day.me).some(function(m){return (m.entries||[]).length||(m.photos||[]).length;});
      if(hasHealth||hasMeals)recordedDays++;
      if(h.weight!==null)weights.push({date:ds,value:h.weight});
      if(h.bodyFat!==null)fats.push({date:ds,value:h.bodyFat});
      if(h.waterCups!==null){water.measured++;if(h.waterCups===5)water.achieved++;}
      var sh=sleepHours(h.bedTime,h.wakeTime);if(sh!==null){sleep.measured++;if(sh>=target.sleepHours)sleep.achieved++;}
      if(h.exerciseHours!==null){exercise.recorded++;exercise.hours+=h.exerciseHours;if(h.exerciseHours>0)exercise.count++;}
      if(h.status)statuses[h.status]++;
    }
    var weeks=[],credited=0;
    if(dates.length){
      for(var start=weekStart(first);start<=end;start=dayAdd(start,7)){
        var w=weekSummary(state.days,start,asOf,target.exercisePerWeek);weeks.push(w);
        if(w.complete && w.end.slice(0,7)===month){
          if(w.recorded){exercise.closedRecordedWeeks++;credited+=Math.min(w.count,w.target);}
          else exercise.missingClosedWeeks++;
        }
      }
    }
    [water,sleep].forEach(function(m){m.missing=dates.length-m.measured;m.rate=m.measured?Math.round(m.achieved/m.measured*100):null;});
    exercise.hours=Math.round(exercise.hours*10)/10;exercise.missing=dates.length-exercise.recorded;
    if(exercise.closedRecordedWeeks)exercise.weeklyRate=Math.round(credited/(exercise.closedRecordedWeeks*target.exercisePerWeek)*100);
    function changes(points){return {points:points,first:points[0]||null,last:points[points.length-1]||null,delta:points.length>1?Math.round((points[points.length-1].value-points[0].value)*10)/10:null};}
    return {month:month,elapsed:dates.length,recordedDays:recordedDays,missingDays:dates.length-recordedDays,weight:changes(weights),bodyFat:changes(fats),water:water,sleep:sleep,exercise:exercise,weeks:weeks,statuses:statuses};
  }
  return {normalize:normalize,decimal:decimal,sleepHours:sleepHours,healthOf:healthOf,dayAdd:dayAdd,weekStart:weekStart,weekSummary:weekSummary,monthSummary:monthSummary,nextMonth:nextMonth,validDate:validDate,validateBackup:validateBackup};
});
