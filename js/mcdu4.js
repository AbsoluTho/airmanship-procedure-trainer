'use strict';
/* ================= MCDU / FMGC, part 4 =================
   SEC INIT A/B and SEC PERF pages, STEP ALTS (step climbs and descents at waypoints), engine-out
   condition (EO CLR*, EO managed speeds, EO MAX), VDEV on PROG and the RTA page.
   Page layouts follow the FlyByWire A32NX MCDU (GPL-3.0): A320_Neo_CDU_SecFplnMain,
   A320_Neo_CDU_StepAltsPage, A320_Neo_CDU_PerformancePage (EO CLR*), A320_Neo_CDU_ProgressPage
   (VDEV) and CDU_RTA_Page (made functional here). Simplified for procedure training. */

{const base=freshState;freshState=function(){return Object.assign(base(),{eo:false,rta:null,stepFrom:'PERFCRZ'})}}
Object.assign(S,{eo:false,rta:null,stepFrom:'PERFCRZ'});

/* ---------- SEC F-PLN: its own INIT A, INIT B and PERF data, used when it is activated or swapped ---------- */
const SEC_KEYS=['init','fuel','perf','p2','spdLim','wind'];
const pickData=()=>clone(Object.fromEntries(SEC_KEYS.map(k=>[k,S[k]])));
function secData(){if(!S.sec)return null;if(!S.sec.data)S.sec.data=pickData();return S.sec.data}
/* run a page with the SEC F-PLN and its data in place of the active ones */
function withSec(fn){const d=secData();if(!d)return fn();const mine={},act=S.active,tm=S.tmpy;
  SEC_KEYS.forEach(k=>{mine[k]=S[k];S[k]=d[k]});S.active=S.sec;S.tmpy=null;
  try{return fn()}finally{SEC_KEYS.forEach(k=>{d[k]=S[k];S[k]=mine[k]});S.sec=S.active;S.sec.data=d;S.active=act;S.tmpy=tm}}
const SEC_OF={INIT:'SECINIT',INITB:'SECINITB',PERFTO:'SECPERFTO',PERFCLB:'SECPERFCLB',PERFCRZ:'SECPERFCRZ',PERFDES:'SECPERFDES',PERFAPPR:'SECPERFAPPR',PERFGA:'SECPERFGA',STEPALT:'SECSTEPALT'};
function secPage(base,title){return{render(){if(!S.sec){S.page='SECIDX';return P.SECIDX.render()}withSec(()=>P[base].render());title()},
  lsk(s,n){withSec(()=>P[base].lsk.call(P[base],s,n));if(SEC_OF[S.page])S.page=SEC_OF[S.page]},
  slew(d){if(P[base].slew)withSec(()=>P[base].slew(d))}}}
const clrRow=r=>{for(let c=0;c<COLS;c++)BUF[r-1][c]={ch:' ',c:'w',s:'L'}};
P.SECINIT=secPage('INIT',()=>{clrRow(1);cput(1,'SEC INIT');put(1,22,'→')});P.SECINIT.arrow=()=>go('SECINITB');
P.SECINITB=secPage('INITB',()=>{clrRow(1);put(1,2,'SEC INIT FUEL PRED');put(1,22,'←')});P.SECINITB.arrow=()=>go('SECINIT');
['PERFTO','PERFCLB','PERFCRZ','PERFDES','PERFAPPR','PERFGA'].forEach(b=>{P['SEC'+b]=secPage(b,()=>put(1,0,'SEC','w'))});
{const lsk0=P.SECIDX.lsk;P.SECIDX.lsk=function(s,n){const k=s+n;
  if(k==='R1'){if(!S.sec)return err('NOT ALLOWED');return go('SECINIT')}
  if(k==='R2'){if(!S.sec)return err('NOT ALLOWED');return go('SEC'+(PERF_OF[S.phase]||'PERFTO'))}
  if(k==='L1'){lsk0.call(this,s,n);if(S.sec)S.sec.data=pickData();return}
  if(k==='L4'&&S.sec&&!flying()){const d=secData();lsk0.call(this,s,n);SEC_KEYS.forEach(x=>S[x]=d[x]);delete S.active.data;return}
  if(k==='L6'&&S.sec&&!flying()){const d=secData(),mine=pickData();lsk0.call(this,s,n);SEC_KEYS.forEach(x=>S[x]=d[x]);delete S.active.data;S.sec.data=mine;return}
  return lsk0.call(this,s,n)}}

/* ---------- STEP ALTS (FlyByWire CDUStepAltsPage) ---------- */
const stepPlan=()=>S.secMode&&S.sec?S.sec:S.active;
function stepLegs(p){p=p||stepPlan();return p?p.legs.map((l,ix)=>({l,ix})).filter(x=>x.l.step!=null):[]}
function stepKind(p,ix){let lvl=I().crz*100;for(const x of stepLegs(p)){if(x.ix===ix)return x.l.step>lvl?'S/C':'S/D';lvl=x.l.step}return''}
const parseStepAlt=v=>{const m=String(v||'').match(/^(FL)?(\d{1,3})$/);if(!m)return null;const a=+m[2]*100;return a<1000||a>39000?null:a};
function maxFl(){return S.eo?eoMax():recMax()}
/* rules (FlyByWire): steps of 1000 ft at least, no step climb after a step descent */
function stepRulesOk(p,list){let lvl=I().crz*100,desc=false;for(const x of list.slice().sort((a,b)=>a.ix-b.ix)){if(Math.abs(x.alt-lvl)<1000)return false;if(x.alt>lvl&&desc)return false;if(x.alt<lvl)desc=true;lvl=x.alt}return true}
function stepWptIx(p,id){const from=flying()?FL.fromIx:0;return p.legs.findIndex((l,ix)=>ix>from&&l.k==='wpt'&&l.id===id&&l.seg==='enr')}
function stepPred(p,ix){const P_=flying()&&FL.path&&p===S.active?FL.path:(p===S.active?vnPath():null);if(!P_)return null;const pt=P_.pts.find(q=>q.ix===ix);if(!pt)return null;
  const s0=flying()?FL.s:0,d=pt.s-s0;let t='----';if(flying())t=utcStr(FL.utc0+(FL.t+d/Math.max(150,FL.gs)*3600)*1000);else{const pr=predict();if(pr)t=hhmm(pr.trip.at(pt.s))}return{d,t}}
P.STEPALT={render(){const p=stepPlan();if(!p||!I().crz){S.page=S.stepFrom;return P[S.page].render()}const L=stepLegs(p),mx=maxFl();
  csegs(1,[[(S.secMode?'SEC ':'')+'STEP ALTS','w'],[' FROM ','w','S'],['FL'+String(I().crz).padStart(3,'0'),'g']]);
  put(2,0,' ALT / WPT','w','S');rput(2,'DIST TIME','w','S');
  for(let i=0;i<4;i++){const r=3+2*i,x=L[i];if(!x){if(i===L.length)put(r,0,'[   ]/[     ]','b');break}
    put(r,0,'FL'+String(Math.round(x.l.step/100)).padStart(3,'0')+'/'+x.l.id,'b');
    const pr=stepPred(p,x.ix);if(mx&&x.l.step>mx*100)rput(r,'ABOVE MAX','w','S');else if(pr&&flying()&&pr.d<20)rput(r,'STEP AHEAD','w','S');
    else if(pr){rput(r,pr.t,'g','S');rput(r,String(Math.round(pr.d)),'g','L',19)}else rput(r,'---- ----','w')}
  if(!L.length){put(11,0,'OPT STEP:','w','S');rput(11,'ENTER ALT ONLY','w','S')}
  put(13,0,'<RETURN')},
 lsk(s,n){const k=s+n,v=S.sp,p=stepPlan();if(k==='L6')return go(S.stepFrom);if(s!=='L'||n>4||!v)return;const L=stepLegs(p),i=n-1;
  const after=()=>{if(maxFl()&&stepLegs(p).some(x=>x.l.step>maxFl()*100))msg2('STEP ABOVE MAX FL')};
  if(i<L.length){const x=L[i];if(v==='CLR'){delete x.l.step;return ok()}
    const parts=v.split('/');let alt=x.l.step,ix=x.ix;
    if(parts[0]){alt=parseStepAlt(parts[0]);if(!alt)return err('FORMAT ERROR')}
    if(parts[1]){ix=stepWptIx(p,parts[1]);if(ix<0)return err('FORMAT ERROR')}
    const list=L.filter(y=>y.ix!==x.ix).map(y=>({ix:y.ix,alt:y.l.step})).concat([{ix,alt}]);if(!stepRulesOk(p,list)||(ix!==x.ix&&p.legs[ix].step!=null))return err('NOT ALLOWED');
    delete x.l.step;p.legs[ix].step=alt;ok();return after()}
  if(i>L.length)return err('NOT ALLOWED');if(L.length>=4)return err('NOT ALLOWED');
  const parts=v.split('/');if(!parts[1])return err('NOT IN PROTOTYPE');   /* optimum step (altitude only) */
  const alt=parseStepAlt(parts[0]);if(!alt)return err('FORMAT ERROR');const ix=stepWptIx(p,parts[1]);if(ix<0)return err(DB.wpt[parts[1]]?'NOT ALLOWED':'FORMAT ERROR');
  if(p.legs[ix].step!=null||!stepRulesOk(p,L.map(y=>({ix:y.ix,alt:y.l.step})).concat([{ix,alt}])))return err('NOT ALLOWED');
  p.legs[ix].step=alt;ok();after()}};
P.SECSTEPALT=P.STEPALT;
/* STEP ALTS> on PERF CRZ (before the descent) and on VERT REV (en-route waypoints) */
const stepAltsOk=()=>!!I().crz&&['PREFLIGHT','TAKEOFF','CLB','CRZ','DONE'].includes(S.phase);
{const r0=P.PERFCRZ.render;P.PERFCRZ.render=function(){r0.call(this);if(stepAltsOk())rput(11,'STEP ALTS>')}
 const l0=P.PERFCRZ.lsk;P.PERFCRZ.lsk=function(s,n){if(s+n==='R5'&&stepAltsOk()){S.stepFrom=S.page;return go('STEPALT')}return l0.call(this,s,n)}}
{const r0=P.VREV.render;P.VREV.render=function(){r0.call(this);const l=cur()&&cur().legs[S.vr];if(l&&l.seg==='enr'&&stepAltsOk())rput(11,'STEP ALTS>')}
 const l0=P.VREV.lsk;P.VREV.lsk=function(s,n){const l=cur()&&cur().legs[S.vr];if(s+n==='R5'&&l&&l.seg==='enr'&&stepAltsOk()){S.stepFrom='VREV';return go('STEPALT')}
   if(s+n==='R2'){if(!l||l.k!=='wpt')return err('NOT ALLOWED');S.rtaWpt=l.id;S.rtaFrom='VREV';return go('RTA')}return l0.call(this,s,n)}}
/* next step of the active F-PLN: passed once its waypoint is sequenced */
function nextStep(){const p=S.active;if(!p)return null;const x=stepLegs(p)[0];if(!x)return null;return{ix:x.ix,alt:x.l.step,passed:flying()&&FL.fromIx>=x.ix,id:x.l.id}}

/* ---------- engine out (FMGC EO condition): set by an engine failure, cleared by EO CLR* ---------- */
function eoMax(){const gw=flying()?gwNowF():gwNow();if(gw==null)return null;return Math.min(250,Math.floor((250-Math.max(0,gw-60)*3)/10)*10)}
function eoRows(crzLike){if(!S.eo)return;if(crzLike){for(const r of[2,3])for(let c=15;c<COLS;c++)BUF[r-1][c]={ch:' ',c:'w',s:'L'}}
  rput(2,'EO ','a','S');rput(3,'CLR*','a')}
const eoGd=()=>{const gw=flying()?gwNowF():gwNow();return gw?charSpeeds(gw).O:null};
[['PERFCLB',false],['PERFCRZ',true],['PERFDES',true]].forEach(([pg,cz])=>{const r0=P[pg].render,l0=P[pg].lsk;
  P[pg].render=function(){r0.call(this);if(S.eo){eoRows(cz);const gd=eoGd();if(gd&&pg!=='PERFDES'){for(let c=0;c<11;c++)BUF[6][c]={ch:' ',c:'w',s:'L'};put(7,0,'EO '+gd,'g','S')}}};
  P[pg].lsk=function(s,n){if(s+n==='R1'&&S.eo){S.eo=false;return}return l0.call(this,s,n)}});
/* PROG: EO MAX in place of REC MAX, no OPT; VDEV in descent and approach */
{const r0=P.PROG.render;P.PROG.render=function(){r0.call(this);
  if(S.eo){const m=eoMax();for(let c=COLS-17;c<COLS;c++)BUF[2][c]={ch:' ',c:'w',s:'L'};segs(3,COLS-17,[['-----','w'],['    ','w'],[m?'FL'+String(m).padStart(3,'0'):'-----',m?'m':'w'],[' ','w']])}
  if(flying()&&!FL.ground&&FL.path&&['DES','APPR'].includes(S.phase)){const v=Math.round((FL.alt-profileAlt(FL.path.sThr-FL.s))/10)*10,t=(v>0?'+':' ')+String(v).padStart(4,' ');
    segs(5,COLS-14,[['VDEV=','w','S'],[t.padStart(5),'g'],['FT','w','S'],[' ','w']])}}}

/* ---------- RTA (required time of arrival at a waypoint; FlyByWire CDU_RTA_Page, made functional) ---------- */
const nowUtcS=()=>{const d=new Date(flying()?FL.utc0+FL.t*1000:Date.now());return d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds()};
const hms=s=>{s=((Math.round(s)%86400)+86400)%86400;return[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
function rtaGeo(){const r=S.rta,p=S.active;if(!r||!p||!flying()||!FL.path)return null;const ix=p.legs.findIndex((l,i)=>i>FL.fromIx&&l.k==='wpt'&&l.id===r.id);if(ix<0)return null;
  const pt=FL.path.pts.find(q=>q.ix===ix);if(!pt)return null;const d=pt.s-FL.s,gs=Math.max(150,FL.gs),eta=nowUtcS()+d/gs*3600;let rem=r.t-nowUtcS();if(rem<-43200)rem+=86400;
  return{d,eta,err:eta-r.t,rem}}
/* managed Mach that meets the RTA (no wind: ground speed = TAS), between green dot and .80 */
function rtaMach(alt){const g=rtaGeo();if(!g||g.d<1)return null;const req=g.rem>30?g.d/g.rem*3600:9999,m=req/sos(alt),gd=charSpeeds(gwNowF()).O,mmin=tasOf(gd,alt)/sos(alt);return Math.max(mmin,Math.min(0.80,m))}
P.RTA={render(){const r=S.rta,g=rtaGeo();cput(1,(S.secMode?'SEC ':'')+'RTA');
  put(2,1,'AT WPT','w','S');put(2,10,'DIST','w','S');rput(2,'RTA','w','S');
  put(3,0,r?r.id:(S.rtaWpt?S.rtaWpt:'[     ]'),'b');if(g)put(3,9,String(Math.round(g.d)).padStart(4),'g');rput(3,r?hms(r.t):'[     ]*','b');
  put(4,1,'ACCUR','w','S');rput(4,'ETA','w','S');put(5,0,'*10/30','w','S');rput(5,g?hms(g.eta):'--:--:--',g?'g':'w');
  put(6,1,'TIME ERROR','w','S');if(g){const e=Math.round(g.err),a=Math.abs(e);rput(7,(e>=0?'+':'-')+String(Math.floor(a/60)).padStart(2,'0')+':'+String(a%60).padStart(2,'0')+(a<30?' ON TIME':e>0?' LATE':' EARLY'),Math.abs(e)<30?'g':'a')}else rput(7,'--:--','w');
  put(8,1,'VMAX','w','S');put(9,0,'.80/340','w');
  {const m=g?rtaMach(FL.alt):null;put(10,1,'REQUIRED SPD','w','S');put(11,0,m?mach(m):'---',m?'g':'w')}
  put(13,0,'<RETURN')},
 lsk(s,n){const k=s+n,v=S.sp;if(k==='L6')return go(S.rtaFrom||'FPLN');
  if(k==='L1'){if(!v)return;if(v==='CLR'){S.rta=null;S.rtaWpt=null;return ok()}if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');
    if(!S.active||!S.active.legs.some(l=>l.k==='wpt'&&l.id===v))return err('NOT IN DATA BASE');S.rtaWpt=v;if(S.rta)S.rta.id=v;return ok()}
  if(k==='R1'){if(!v)return;if(v==='CLR'){S.rta=null;return ok()}const m=v.match(/^(\d{2})(\d{2})(\d{2})?$/);if(!m)return err('FORMAT ERROR');
    if(+m[1]>23||+m[2]>59||(m[3]&&+m[3]>59))return err('ENTRY OUT OF RANGE');const id=S.rtaWpt||(S.rta&&S.rta.id);if(!id)return err('NOT ALLOWED');
    S.rta={id,t:+m[1]*3600+ +m[2]*60+(+m[3]||0)};return ok()}
  return err('NOT ALLOWED')}};

/* ---------- messages ---------- */
{const t0=msgTick;msgTick=function(){t0();
  msgCond('STEP AHEAD',false,()=>{if(!flying()||S.phase!=='CRZ')return false;const st=nextStep();if(!st||st.passed)return false;const pr=stepPred(S.active,st.ix);return!!(pr&&pr.d<20)})}}
/* ND: step climb (cyan) and step descent (white) symbols at the step waypoints ahead */
{const pw0=pseudoWpts;pseudoWpts=function(){const out=pw0()||[];try{const p=S.active;if(p){const P_=flying()&&FL.path?FL.path:vnPath();const from=flying()?FL.fromIx:0;
  for(const x of stepLegs(p)){if(x.ix<=from)continue;const pt=P_&&P_.pts.find(q=>q.ix===x.ix);if(pt){const up=stepKind(p,x.ix)==='S/C';out.push({k:up?'sc':'td',c:up?'b':'w',pos:pt.p})}}}}catch(e){}return out.length?out:null}}
window.__stepTest={nextStep,stepLegs};
