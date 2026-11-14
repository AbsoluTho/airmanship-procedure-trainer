'use strict';
/* ================= exercise ================= */
function seqIn(ids,seq){for(let i=0;i+seq.length<=ids.length;i++)if(seq.every((s,j)=>ids[i+j]===s))return true;return false}
const TASKS=[
 ['INIT A: FROM/TO OEJN/OETB',()=>I().from==='OEJN'&&I().to==='OETB'],
 ['INIT A: ALTN OEMA',()=>I().altn==='OEMA'],
 ['INIT A: FLT NBR',()=>!!I().flt],
 ['INIT A: COST INDEX 20',()=>I().ci===20],
 ['INIT A: CRZ FL340 and temperature',()=>I().crz===340&&I().temp!=null],
 ['DEPARTURE: RWY 16C, SID MIGD2E',()=>{const a=S.active;return!!a&&a.rwy==='16C'&&a.sid==='MIGD2E'}],
 ['AIRWAYS: L677 to WEJ, V54 to TBK',()=>{const a=S.active;if(!a)return false;const ids=a.legs.filter(l=>l.k==='wpt').map(l=>l.id);
   return seqIn(ids,['MIGDA','RIDEP','YEN','RAGNO','ORGIM','TUGRU','WEJ','LABUN','NETOL','DEMSU'])}],
 ['ARRIVAL: ILS24 via D179O',()=>{const a=S.active;return!!a&&a.appr==='ILS24'&&a.via==='D179O'}],
 ['No discontinuity left before the destination',()=>{const a=S.active;if(!a)return false;const di=idxK(a,'dest');return!!a.sid&&!!a.appr&&!a.legs.slice(0,di).some(l=>l.k==='disc')}],
 ['ND PLAN: scroll the F-PLN until OETB is the PLAN centre',()=>EFIS.mode==='PLAN'&&!!EFIS.ctr&&EFIS.ctr.id==='OETB'&&!!S.active&&!!S.active.appr],
 ['INIT B: ZFW/ZFWCG 58.4/27.5',()=>S.fuel.zfw===58.4&&S.fuel.cg===27.5],
 ['INIT B: BLOCK 8.6',()=>S.fuel.block===8.6],
 ['PERF TAKE OFF: V1 141, VR 146, V2 150',()=>{const q=S.perf;return q.v1===141&&q.vr===146&&q.v2===150}],
 ['PERF TAKE OFF: FLAPS/THS 1/UP0.4, FLEX 54',()=>{const q=S.perf;return q.flaps===1&&q.ths==='UP0.4'&&q.flex===54}]];
let lastT='';
function tasks(){const h=TASKS.map(([t,f])=>{const d=f();return`<li class="${d?'done':''}"><span class="ck">${d?'✓':''}</span><span>${t}</span></li>`}).join('');
  if(h!==lastT){$('#tasks').innerHTML=h;lastT=h}}
$('#reset').addEventListener('click',()=>{const e=S.elec;S=freshState();S.elec=e;render()});

/* ================= views / modal ================= */
let view='mcdu';
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.v;
  document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected',x===b));
  $('#v-mcdu').classList.toggle('on',view==='mcdu');$('#v-3d').classList.toggle('on',view==='3d');
  if(view==='3d')init3D().then(()=>window.__draw3D&&window.__draw3D());}));
function openMcdu(side){$('#mslot').appendChild(mc);$('#mtitle').textContent=(side==='fo'?'First Officer':'Captain')+' MCDU'+(S.elec.ext?'':' · no AC power: set EXT PWR ON');
  mc.classList.toggle('off',!S.elec.ext);$('#modal').classList.add('on')}
function closeMcdu(){$('#mcduHome').appendChild(mc);mc.classList.remove('off');$('#modal').classList.remove('on')}
$('#mclose').addEventListener('click',closeMcdu);
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeMcdu()});

window.__S=()=>S;window.__press=press;window.__efis=efisSet;window.__EFIS=EFIS;
render();

/* ================= FULL SCREEN =================
   Instruments, MCDU/ECAM and the flight bar fill the window (browser full screen where allowed). EXIT FULL SCREEN, Esc,
   or an iPad / phone turned to portrait leaves it. */
document.body.insertAdjacentHTML('beforeend','<button type="button" class="fs-exit" id="fsExit">EXIT FULL SCREEN</button>');
const FS={req:false};
function fsSet(on){if(on){const t=document.querySelector('.tab[data-v="mcdu"]');if(t&&view!=='mcdu')t.click();document.body.classList.add('fs');
    const el=document.documentElement,rq=el.requestFullscreen||el.webkitRequestFullscreen;if(rq&&!document.fullscreenElement){try{const p=rq.call(el);FS.req=true;if(p&&p.catch)p.catch(()=>{FS.req=false})}catch(e){FS.req=false}}}
  else{document.body.classList.remove('fs');const ex=document.exitFullscreen||document.webkitExitFullscreen;if(FS.req&&(document.fullscreenElement||document.webkitFullscreenElement)&&ex){try{ex.call(document)}catch(e){}}FS.req=false}
  setTimeout(()=>{dispatchEvent(new Event('resize'))},60);setTimeout(()=>{dispatchEvent(new Event('resize'))},400)}
$('#fsBtn').addEventListener('click',()=>fsSet(true));$('#fsExit').addEventListener('click',()=>fsSet(false));
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{if(FS.req&&!(document.fullscreenElement||document.webkitFullscreenElement))fsSet(false)}));
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('fs'))fsSet(false)});
/* touch device turned to portrait: leave full screen */
function fsOrient(){if(document.body.classList.contains('fs')&&navigator.maxTouchPoints>0&&innerHeight>innerWidth)fsSet(false)}
addEventListener('resize',fsOrient);addEventListener('orientationchange',()=>setTimeout(fsOrient,200));
window.__fs=fsSet;
