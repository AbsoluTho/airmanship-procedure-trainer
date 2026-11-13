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
 ['ARRIVAL: ILS31 via D179O',()=>{const a=S.active;return!!a&&a.appr==='ILS31'&&a.via==='D179O'}],
 ['No discontinuity left before the destination',()=>{const a=S.active;if(!a)return false;const di=idxK(a,'dest');return!!a.sid&&!!a.appr&&!a.legs.slice(0,di).some(l=>l.k==='disc')}]];
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

window.__S=()=>S;window.__press=press;
render();
