/* 小兔健康追蹤表 版本2. Stable form DOM: never replace a field while typing. */
(function(){
'use strict';
var Core=window.HealthCore,dailyDate='',monthMounted='',selectedMonth='',lastSave='',savingOk=true;
var TYPES=['有氧','重訓'],ACTIVITIES=['快走','跑步','腳踏車','游泳','重訓','瑜伽'],TAGS=['精神好','疲倦','壓力大','身體不舒服'];
function el(id){return document.getElementById(id);}
function safe(v){return esc(v == null?'':v);}
function shown(v){return v===null?'':fmt(v);}
function briefDate(ds){return Number(ds.slice(5,7))+'/'+Number(ds.slice(8,10));}
function decimalsField(name,label,value,placeholder){
  return '<div class="health-field"><label for="health-'+name+'">'+label+'</label><input id="health-'+name+'" data-hfield="'+name+'" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="'+placeholder+'" value="'+safe(shown(value))+'" aria-describedby="error-'+name+'"><div id="error-'+name+'" class="field-error"></div></div>';
}
function chip(label,action,key){return '<button class="health-chip" data-hact="'+action+'" data-key="'+safe(key || label)+'" aria-pressed="false">'+safe(label)+'</button>';}
function renderDaily(force){
  var h=Core.healthOf(getDay(curDate,false));
  if(force || dailyDate!==curDate){
    dailyDate=curDate;var dl=dateLabel(curDate);
    el('healthWrap').innerHTML=
      '<div class="card health-date"><button data-hact="prevday" aria-label="前一天">‹</button><label><input id="healthDate" type="date" value="'+curDate+'" max="'+todayStr()+'" aria-label="選擇記錄日期"><small>'+safe(dl.main)+' '+safe(dl.sub)+'</small></label><button id="healthNext" data-hact="nextday" aria-label="後一天">›</button></div>'+
      '<p class="health-note">一天一點點，照顧自己就好。欄位都可以留空，會自動儲存。</p>'+
      '<div class="card"><div class="health-title">⚖️ 體態小記<small>不用每天量</small></div><div class="health-grid">'+decimalsField('weight','體重 · kg',h.weight,'例如 60.5')+decimalsField('bodyFat','體脂 · %',h.bodyFat,'例如 28.5')+'</div></div>'+
      '<div class="card"><div class="health-title">🌙 昨晚睡得如何？<small id="sleepGoalLabel"></small></div><div class="health-grid"><div class="health-field"><label for="health-bedTime">就寢時間</label><input id="health-bedTime" data-hfield="bedTime" type="time" value="'+safe(h.bedTime)+'"></div><div class="health-field"><label for="health-wakeTime">起床時間</label><input id="health-wakeTime" data-hfield="wakeTime" type="time" value="'+safe(h.wakeTime)+'"></div></div><div id="sleepSummary" class="health-pill" aria-live="polite"></div><div class="health-hint">記在起床的這一天；自動跨午夜計算。相同時間視為 0 小時，不會當作睡滿 24 小時。</div></div>'+
      '<div class="card"><div class="health-title">💧 喝水小任務<small>每杯 500cc</small></div><div class="cup-row">'+[1,2,3,4,5].map(function(n){return '<button class="cup" data-hact="water" data-key="'+n+'" aria-label="記到第 '+n+' 杯" aria-pressed="false"><span class="cup-icon">🥛</span><span>'+n+' 杯</span></button>';}).join('')+'</div><div class="health-line"><strong id="waterSummary"></strong><button class="health-chip" data-hact="waterzero">記為 0 杯</button></div><div class="health-hint">點第幾杯，就記到第幾杯；再點最後一杯可取消。沒點選＝還沒記，不是 0 杯。</div></div>'+
      '<div class="card"><div class="health-title">🏃 今天的運動<small id="exerciseGoalLabel"></small></div><div class="health-grid">'+decimalsField('exerciseHours','運動時數 · 小時',h.exerciseHours,'例如 0.5 或 1.0')+'<div class="health-field"><label>今天休息也沒關係</label><button class="softbtn" data-hact="rest">記為休息（0 小時）</button></div></div><div class="quick-row">'+TYPES.map(function(t){return chip(t,'type');}).join('')+'</div><div class="quick-row">'+ACTIVITIES.map(function(t){return chip(t,'activity');}).join('')+'</div><div class="health-field" style="margin-top:10px"><label for="health-exerciseItem">具體項目（可自由填寫）</label><input id="health-exerciseItem" data-hfield="exerciseItem" type="text" maxlength="160" autocomplete="off" autocorrect="off" placeholder="例如：快走、深蹲" value="'+safe(h.exerciseItem)+'"></div><div id="weekSummary" class="health-pill"></div><div class="health-hint">週一至週日：當天填大於 0 的時數算 1 次，同一天多項運動仍算 1 次。休息日不算失敗，空白也不當作休息。</div></div>'+
      '<div class="card"><div class="health-title">🚦 今天的狀態<small>由你自己決定</small></div><div class="lights"><button data-hact="status" data-key="green" aria-pressed="false">🟢 很不錯</button><button data-hact="status" data-key="yellow" aria-pressed="false">🟡 普普通通</button><button data-hact="status" data-key="red" aria-pressed="false">🔴 需要休息</button></div><div class="quick-row">'+TAGS.map(function(t){return chip(t,'tag');}).join('')+'</div><div class="health-hint">可選小標籤；再點一次可以取消。不用體重或熱量評斷今天好不好。</div></div>'+
      '<button class="health-link" data-hact="diet"><span><b>🍽️ 今天的飲食</b><small id="healthDietSummary"></small><small id="healthPortionSummary"></small></span><span>查看／記錄 ›</span></button><div id="healthSaveStatus" class="save-line" role="status"></div>';
  }
  el('healthNext').disabled=curDate>=todayStr();
  updateDaily();
}
function setPressed(selector,on){document.querySelectorAll(selector).forEach(function(b){var yes=on(b.getAttribute('data-key'));b.classList.toggle('on',yes);b.setAttribute('aria-pressed',yes?'true':'false');});}
function updateDaily(){
  if(!el('sleepSummary'))return;
  var h=Core.healthOf(getDay(curDate,false)),target=state.healthTargets,sh=Core.sleepHours(h.bedTime,h.wakeTime);
  el('sleepGoalLabel').textContent='每天 '+fmt(target.sleepHours)+' 小時';
  el('sleepSummary').textContent=sh===null?'填寫兩個時間，自動算出睡眠時數':('睡了 '+fmt(sh)+' 小時 · '+(sh>=target.sleepHours?'已達睡眠目標 ✨':'目標 '+fmt(target.sleepHours)+' 小時'));
  el('waterSummary').textContent=h.waterCups===null?'尚未記錄 / 2500cc':h.waterCups*500+' / 2500cc'+(h.waterCups===5?' ✨':'');
  setPressed('[data-hact=water]',function(n){return h.waterCups!==null && Number(n)<=h.waterCups;});
  setPressed('[data-hact=type]',function(t){return h.exerciseTypes.includes(t);});
  setPressed('[data-hact=status]',function(t){return h.status===t;});
  setPressed('[data-hact=tag]',function(t){return h.tags.includes(t);});
  el('exerciseGoalLabel').textContent='每週 '+target.exercisePerWeek+' 次';
  var w=Core.weekSummary(state.days,curDate,todayStr(),target.exercisePerWeek);
  el('weekSummary').textContent=briefDate(w.start)+'–'+briefDate(w.end)+' · 已運動 '+w.count+' / '+w.target+' 次，共 '+fmt(w.hours)+' 小時'+(w.count>=w.target?' ✨':'')+' · '+w.missing+' 天未填';
  var s=sumDay(getDay(curDate,false));
  el('healthDietSummary').textContent='已記錄約 '+fmtKcal(s.kcal)+' / '+state.targets.kcal+' 大卡';
  el('healthPortionSummary').textContent=CATS.map(function(c){return c.s+' '+fmt(s.cats[c.k]||0);}).join(' · ');
  el('healthSaveStatus').textContent=savingOk?(lastSave || '填寫後自動儲存；資料只存在這個瀏覽器'):'⚠️ 尚未儲存成功，請先到設定匯出備份';
  el('healthSaveStatus').classList.toggle('error',!savingOk);
}
function commitHealth(h){
  getDay(curDate,true).health=h;
  savingOk=saveState();lastSave=savingOk?'已儲存在這支手機 ✓':'';
  updateDaily();
}
function changeField(input,commit){
  if(input.isComposing)return;
  var key=input.getAttribute('data-hfield'),h=Core.healthOf(getDay(curDate,false)),value=input.value;
  if(['weight','bodyFat','exerciseHours'].includes(key)){
    var bounds=key==='weight'?[0.1,500]:key==='bodyFat'?[0,100]:[0,24],parsed=Core.decimal(value,bounds[0],bounds[1]);
    input.setAttribute('aria-invalid',parsed.ok?'false':'true');
    el('error-'+key).textContent=parsed.ok?'':'請填 '+bounds[0]+'–'+bounds[1]+' 的數字，最多小數點一位';
    if(!parsed.ok || commit===false)return;h[key]=parsed.value;
  }else h[key]=value;
  commitHealth(h);
}
function deltaText(data,unit){return data.delta===null?'至少需要兩筆測量':(data.delta>0?'+':'')+fmt(data.delta)+' '+unit;}
function trend(data,name,unit){
  var pts=data.points;
  if(!pts.length)return '<p class="health-note">還沒有'+name+'測量，填寫後就會出現趨勢。</p>';
  var values=pts.map(function(p){return p.value;}),min=Math.min.apply(null,values),max=Math.max.apply(null,values);
  if(min===max){min-=0.5;max+=0.5;}
  var span=max-min;
  var start=Date.parse(pts[0].date),period=Date.parse(pts[pts.length-1].date)-start;
  var xy=pts.map(function(p){return {x:period?48+(Date.parse(p.date)-start)/period*236:166,y:94-(p.value-min)/span*64,p:p};});
  var line=xy.length>1?'<polyline fill="none" stroke="#a58bd8" stroke-width="2.5" points="'+xy.map(function(a){return a.x+','+a.y;}).join(' ')+'"/>':'';
  return '<svg class="trend" viewBox="0 0 320 128" role="img" aria-label="'+name+'趨勢，'+pts.length+' 筆測量"><line x1="48" y1="30" x2="284" y2="30" stroke="#eee4f2"/><line x1="48" y1="94" x2="284" y2="94" stroke="#eee4f2"/><text x="4" y="34">'+fmt(max)+'</text><text x="4" y="98">'+fmt(min)+'</text>'+line+xy.map(function(a){return '<circle cx="'+a.x+'" cy="'+a.y+'" r="4"><title>'+a.p.date+' '+a.p.value+' '+unit+'</title></circle>';}).join('')+'<text x="48" y="119">'+briefDate(pts[0].date)+'</text><text x="284" y="119" text-anchor="end">'+briefDate(pts[pts.length-1].date)+'</text></svg>'+ '<details><summary class="health-hint">查看 '+pts.length+' 筆測量數據</summary><ul class="measure-list">'+pts.map(function(p){return '<li>'+safe(p.date)+' · '+fmt(p.value)+' '+unit+'</li>';}).join('')+'</ul></details>';
}
function bodyCard(data,name,unit){
  var interval=data.first?briefDate(data.first.date)+' '+fmt(data.first.value)+' '+unit+' → '+briefDate(data.last.date)+' '+fmt(data.last.value)+' '+unit:'尚未測量';
  return '<div class="card"><div class="health-title">'+name+'<small>'+safe(deltaText(data,unit==='%'?'百分點':unit))+'</small></div><div class="health-hint">'+interval+'</div>'+trend(data,name,unit)+'</div>';
}
function rateText(m){return m.rate===null?'尚未記錄':m.rate+'%';}
function habitMetric(title,m){return '<div class="month-metric"><div class="topline"><span>'+title+'</span><strong>'+rateText(m)+'</strong></div><p>達標 '+m.achieved+' / 有填 '+m.measured+' 天 · 未填 '+m.missing+' 天</p></div>';}
function renderMonth(force){
  if(!selectedMonth)selectedMonth=curDate.slice(0,7);
  if(force || monthMounted!==selectedMonth){
    monthMounted=selectedMonth;
    el('monthWrap').innerHTML='<div class="card"><label for="monthSelect" class="month-heading" style="display:block">📖 月末小回顧</label><input class="month-picker" type="month" id="monthSelect" value="'+selectedMonth+'" aria-label="選擇回顧月份"><div id="monthCoverage" class="health-hint"></div></div><div id="monthStats"></div><div id="monthBody"></div><div class="card" id="monthHabits"></div><div class="card"><div class="health-title">🏃 每週運動進度</div><div id="monthWeeks"></div></div><div class="card"><div class="health-title" id="nextPlanTitle"></div><div class="health-field"><label for="monthPlan">下個月微調計畫</label><textarea id="monthPlan" data-monthfield="plan" maxlength="1200" placeholder="例如：提早半小時就寢，運動排在一、三、六"></textarea></div><div class="health-field" style="margin-top:12px"><label for="monthReward">給自己的小獎勵</label><input id="monthReward" data-monthfield="reward" maxlength="240" placeholder="例如：買一本想看的書"></div><label class="reward-check"><input id="monthDone" type="checkbox" data-monthfield="done">這個月計畫已完成</label><label class="reward-check"><input id="monthClaimed" type="checkbox" data-monthfield="rewardReceived">獎勵已領取</label><div class="health-hint" id="planSaveStatus">自由設定、自動儲存；不必用體重下降換獎勵。</div></div><button class="ghostbtn" data-hact="history">📅 查看／補登每日紀錄</button>';
    var next=Core.nextMonth(selectedMonth),plan=state.months[next] || {};
    el('monthPlan').value=plan.plan || '';el('monthReward').value=plan.reward || '';
    el('monthDone').checked=!!plan.done;el('monthClaimed').checked=!!plan.rewardReceived;
    el('nextPlanTitle').textContent='🎁 '+next+' 的計畫與獎勵';
    el('monthDone').parentElement.lastChild.textContent=' '+next+' 計畫已完成';
  }
  var r=Core.monthSummary(state,selectedMonth,todayStr()),t=state.healthTargets;
  el('monthCoverage').textContent='截至 '+(selectedMonth===todayStr().slice(0,7)?todayStr():selectedMonth)+' · 有記錄 '+r.recordedDays+' 天／已過 '+r.elapsed+' 天 · 未記錄 '+r.missingDays+' 天';
  el('monthStats').innerHTML='<div class="card health-grid"><div class="stat-box"><b>'+r.exercise.count+' 次</b><span>本月運動 · 共 '+fmt(r.exercise.hours)+' 小時</span></div><div class="stat-box"><b>'+r.recordedDays+' 天</b><span>有飲食或健康記錄</span></div></div>';
  el('monthBody').innerHTML=bodyCard(r.weight,'⚖️ 體重','kg')+bodyCard(r.bodyFat,'🌿 體脂','%');
  var ex=r.exercise;
  el('monthHabits').innerHTML='<div class="health-title">🌱 習慣達成率</div>'+habitMetric('睡滿 '+fmt(t.sleepHours)+' 小時',r.sleep)+habitMetric('喝水 2500cc',r.water)+'<div class="month-metric"><div class="topline"><span>每週運動 '+t.exercisePerWeek+' 次 · 目標進度</span><strong>'+(ex.weeklyRate===null?'尚無完整週紀錄':ex.weeklyRate+'%')+'</strong></div><p>已結束且有填的 '+ex.closedRecordedWeeks+' 週 · 整週未填 '+ex.missingClosedWeeks+' 週</p></div><div class="health-hint">睡眠／喝水以有填的天數計算，未填另列。運動以週目標次數的完成比例計算，單週最多 100%；只計已結束、有運動或休息紀錄的週，跨月週依週日歸屬並採整週資料。進行中週不算失敗。</div><div class="health-hint">狀態：🟢 '+r.statuses.green+' 天 · 🟡 '+r.statuses.yellow+' 天 · 🔴 '+r.statuses.red+' 天。這是你的感受，不是健康診斷。</div>';
  el('monthWeeks').innerHTML=r.weeks.length?r.weeks.map(function(w){return '<div class="week-item"><span>'+briefDate(w.start)+'–'+briefDate(w.end)+'<small>'+(!w.complete?'進行中':w.end.slice(0,7)!==selectedMonth?'跨月 · 歸下個月':w.recorded?'已結束':'整週尚未記錄')+' · '+w.missing+' 天未填</small></span><strong>'+w.count+' / '+w.target+' 次 · '+fmt(w.hours)+' 小時</strong></div>';}).join(''):'這個月份還沒有可統計的日期。';
}
function renderGoalSettings(){
  el('healthTargetGrid').innerHTML='<div class="health-grid"><div class="health-field"><label for="goalSleep">睡眠 · 小時／天</label><input id="goalSleep" type="text" inputmode="decimal" value="'+state.healthTargets.sleepHours+'"></div><div class="health-field"><label for="goalExercise">運動 · 次／週</label><input id="goalExercise" type="text" inputmode="numeric" value="'+state.healthTargets.exercisePerWeek+'"></div></div><div class="health-hint">喝水：5 杯 × 500cc＝2500cc。目標是你的自訂計畫，不代表醫療建議。</div><button class="primary" data-hact="savegoals" style="margin-top:12px">儲存健康目標</button>';
}
function invalidate(){dailyDate='';monthMounted='';lastSave='';}
function chooseDay(ds){if(!Core.validDate(ds)||ds>todayStr())return;curDate=ds;renderToday();renderDaily();}
function toggleArray(arr,value){var idx=arr.indexOf(value);if(idx<0)arr.push(value);else arr.splice(idx,1);return arr;}
document.addEventListener('input',function(ev){
  var input=ev.target;
  if(input.hasAttribute('data-hfield'))changeField(input,!['weight','bodyFat','exerciseHours'].includes(input.getAttribute('data-hfield')));
  if(input.hasAttribute('data-monthfield') && input.type!=='checkbox')saveMonthField(input);
});
document.addEventListener('compositionend',function(ev){if(ev.target.hasAttribute('data-hfield'))changeField(ev.target);});
function saveMonthField(input){
  var next=Core.nextMonth(selectedMonth),plan=state.months[next] || {};plan[input.getAttribute('data-monthfield')]=input.type==='checkbox'?input.checked:input.value;
  state.months[next]=plan;var ok=saveState();el('planSaveStatus').textContent=ok?'已儲存在這支手機 ✓':'⚠️ 尚未儲存成功，請先匯出備份';
}
document.addEventListener('change',function(ev){
  if(ev.target.id==='healthDate')chooseDay(ev.target.value);
  if(ev.target.id==='monthSelect' && /^\d{4}-(0[1-9]|1[0-2])$/.test(ev.target.value)){selectedMonth=ev.target.value;renderMonth();}
  if(ev.target.hasAttribute('data-hfield'))changeField(ev.target);
  if(ev.target.hasAttribute('data-monthfield') && ev.target.type==='checkbox')saveMonthField(ev.target);
});
document.addEventListener('click',function(ev){
  var b=ev.target.closest('[data-hact]');if(!b)return;
  var action=b.getAttribute('data-hact'),key=b.getAttribute('data-key'),h=Core.healthOf(getDay(curDate,false));
  if(action==='prevday'){chooseDay(Core.dayAdd(curDate,-1));return;}
  if(action==='nextday'){chooseDay(Core.dayAdd(curDate,1));return;}
  if(action==='diet'){switchTab('today');return;}
  if(action==='history'){switchTab('history');return;}
  if(action==='savegoals'){
    var sleep=Core.decimal(el('goalSleep').value,1,24),exercise=Core.decimal(el('goalExercise').value,1,7);
    if(!sleep.ok||sleep.value===null||!exercise.ok||exercise.value===null||!Number.isInteger(exercise.value)){toast('睡眠請填 1–24 小時；運動請填 1–7 的整數次數');return;}
    state.healthTargets={sleepHours:sleep.value,exercisePerWeek:exercise.value};var ok=saveState();updateDaily();if(ok)toast('健康目標已更新 ✓');return;
  }
  if(action==='water'){var n=Number(key);h.waterCups=h.waterCups===n?n-1:n;}
  else if(action==='waterzero')h.waterCups=0;
  else if(action==='type')h.exerciseTypes=toggleArray(h.exerciseTypes,key);
  else if(action==='tag')h.tags=toggleArray(h.tags,key);
  else if(action==='status')h.status=h.status===key?'':key;
  else if(action==='rest'){h.exerciseHours=0;el('health-exerciseHours').value='0';el('error-exerciseHours').textContent='';el('health-exerciseHours').setAttribute('aria-invalid','false');}
  else if(action==='activity'){
    var items=h.exerciseItem.split('、').map(function(x){return x.trim();}).filter(Boolean);items=toggleArray(items,key);h.exerciseItem=items.join('、');el('health-exerciseItem').value=h.exerciseItem;
  }else return;
  commitHealth(h);
});
document.addEventListener('focusin',function(ev){if(ev.target.matches('input,textarea,select'))document.body.classList.add('typing');});
document.addEventListener('focusout',function(){setTimeout(function(){if(!document.activeElement.matches('input,textarea,select'))document.body.classList.remove('typing');},60);});
function flushPendingField(){
  var input=document.activeElement;
  if(input && input.hasAttribute('data-hfield'))changeField(input,true);
}
window.addEventListener('pagehide',flushPendingField);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flushPendingField();});
window.HealthUI={renderDaily:renderDaily,renderMonth:renderMonth,renderGoalSettings:renderGoalSettings,invalidate:invalidate};
})();
