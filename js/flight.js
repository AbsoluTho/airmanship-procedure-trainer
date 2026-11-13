'use strict';
/* ================= automatic flight =================
   A procedure trainer, not a flight model: the aircraft follows the active F-PLN on a fixed
   lateral path and a scripted vertical and speed profile. Phases, FMA modes, fuel and
   sequencing are driven from that profile so the MCDU, ND and PFD react as in a normal flight.
   Numbers are approximations for training the procedures only. */
const FL={active:false,running:false,rate:4,t:0,utc0:0,
  path:null,s:0,pos:null,hdgT:0,trkT:0,roll:0,pitch:0,alt:0,vs:0,ias:0,tas:0,gs:0,mach:0,ground:true,
  stage:'IDLE',conf:'1+F',gear:true,fob:0,fromIx:0,toIx:1,apprPb:false,ap:false,
  fma:{c1:[],c2:[],c3:[],c4:[],c5:[]},fmaT:{},td:null,tc:null,lw:null,target:{spd:null,mgd:true,alt:null}};
const KT2NMS=1/3600;

/* ---------- lateral path ---------- */
function buildPath(){const p=S.active,pts=[];let vr=0;
  const push=(pos,ix)=>{const last=pts[pts.length-1];if(last&&gc(last.p,pos)<0.01){if(ix!=null)last.ix=ix;return}pts.push({p:pos,ix})};
  for(let ix=0;ix<p.legs.length;ix++){const l=p.legs[ix];
    if(l.seg==='map')break;
    if(l.k==='orig'){const ap=DB.apt[l.id],r=ap.rwy[l.rwy];vr=ap.var||0;push(r.pos,ix);push(dst(r.pos,r.crs+vr,Math.min(1.6,r.len/1852*0.7)),null);continue}
    if(l.k==='ca'){const o=p.legs[0],ap=DB.apt[o.id],r=ap.rwy[o.rwy];push(dst(r.pos,r.crs+vr,r.len/1852+l.aal/320),ix);continue}
    if(l.k==='wpt'){const pos=DB.wpt[l.id];if(!pos)continue;const prev=pts[pts.length-1];
      if(l.lbl==='ARC'&&l.ctr&&DB.wpt[l.ctr]&&prev)arcPts(prev.p,pos,DB.wpt[l.ctr]).slice(1,-1).forEach(q=>push(q,null));
      push(pos,ix);continue}
    if(l.k==='dest'){const ap=DB.apt[l.id],r=ap.rwy[l.rwy];push(r.pos,ix);push(dst(r.pos,r.crs+(ap.var||0),r.len/1852*0.75),null);break}}
  let s=0;pts.forEach((q,i)=>{if(i)s+=gc(pts[i-1].p,q.p);q.s=s});
  const thr=pts.find(q=>q.ix!=null&&p.legs[q.ix].k==='dest');
  return{pts,len:s,sThr:thr.s}}
function posAt(P,s){const a=P.pts;let i=1;while(i<a.length-1&&a[i].s<s)i++;const A=a[i-1],B=a[i],f=Math.max(0,Math.min(1,(s-A.s)/((B.s-A.s)||1)));
  return{pos:[A.p[0]+(B.p[0]-A.p[0])*f,A.p[1]+(B.p[1]-A.p[1])*f],trk:brg(A.p,B.p),i}}

/* ---------- vertical profile ---------- */
function destRwy(){const p=S.active,d=p.legs[idxK(p,'dest')],a=DB.apt[d.id];return{a,r:a.rwy[d.rwy],tdze:a.rwy[d.rwy].tdze??a.elev}}
function faf(){const p=S.active,di=idxK(p,'dest');for(let i=di-1;i>0;i--){const l=p.legs[i];if(l.k==='wpt'&&l.alt&&l.seg==='arr')return l.alt.v}return destRwy().tdze+1500}
function profileAlt(dtg){const tdze=destRwy().tdze,Ai=faf(),dgs=(Ai-tdze-50)/318;
  if(dtg<=dgs)return tdze+50+318*Math.max(0,dtg);if(dtg<=dgs+8)return Ai;return Ai+318*(dtg-dgs-8)}
function tdDist(){const crz=I().crz*100,tdze=destRwy().tdze,Ai=faf(),dgs=(Ai-tdze-50)/318;return dgs+8+(crz-Ai)/318}

/* ---------- atmosphere and speeds ---------- */
const tasOf=(ias,alt)=>ias*(1+alt/1000*0.02);
const iasOf=(tas,alt)=>tas/(1+alt/1000*0.02);
const sos=alt=>661.47*Math.sqrt(Math.max(216.65,288.15-1.98*alt/1000)/288.15);
function gwNowF(){const f=S.fuel;return f.zfw+FL.fob}
function cfgSpeeds(){const w=gwNowF(),cs=charSpeeds(w);return{GD:cs.O,S:cs.S,F:cs.F,VLS:vls(w,S.p2.conf3)}}

/* ---------- readiness ---------- */
function flightReady(){const a=S.active,i=I(),q=S.perf,f=S.fuel,miss=[];
  if(!a||!a.rwy)miss.push('F-PLN: departure runway');if(!a||!a.appr)miss.push('F-PLN: approach');
  if(a&&a.legs.slice(0,idxK(a,'dest')).some(l=>l.k==='disc'))miss.push('F-PLN: discontinuity');
  if(!i.crz)miss.push('INIT A: CRZ FL');if(f.zfw==null||f.block==null)miss.push('INIT FUEL PRED: ZFW and BLOCK');
  if(!q.v1||!q.vr||!q.v2)miss.push('PERF TAKE OFF: V1, VR, V2');if(!q.flaps)miss.push('PERF TAKE OFF: FLAPS/THS');
  return miss}

/* ---------- start, stop ---------- */
function flightStart(){const miss=flightReady();if(miss.length)return miss;
  const P=buildPath(),r=DB.apt[orig()].rwy[S.active.rwy];
  Object.assign(FL,{active:true,running:true,t:0,utc0:Date.now(),path:P,s:0,pos:r.pos,hdgT:r.crs+(DB.apt[orig()].var||0),trkT:r.crs+(DB.apt[orig()].var||0),
    roll:0,pitch:0,alt:r.tdze??elevO(),vs:0,ias:0,tas:0,gs:0,mach:0,ground:true,stage:'ROLL',conf:q2conf(),gear:true,
    fob:S.fuel.block-(S.fuel.taxi??0.2),fromIx:0,toIx:1,apprPb:false,ap:false,fmaT:{},lw:null,lastT:null});
  FL.td=P.sThr-tdDist();S.phase='TAKEOFF';S.msg=null;setFma();flightTick(0);return[]}
function q2conf(){const f=S.perf.flaps;return f===1?'1+F':String(f||1)}
function flightReset(){Object.assign(FL,{active:false,running:false,path:null,stage:'IDLE',fma:{c1:[],c2:[],c3:[],c4:[],c5:[]},ias:0,gs:0,tas:0});S.phase='PREFLIGHT';S.apprArm=false;refreshAll()}

/* ---------- FMA ---------- */
function setFma(){const st=FL.stage,a=S.perf,fx=a.flex!=null?'FLX '+a.flex:'TOGA',agl=FL.alt-groundElev(),f={c1:[],c2:[],c3:[],c4:[],c5:[]};
  const ath=FL.stage==='ROLL'||FL.stage==='SRS0'?'b':'w';
  if(st==='ROLL'||st==='SRS0'){f.c1=[['MAN','w'],[fx,'w']];f.c2=[['SRS','g'],['CLB','b']];f.c3=[[agl<30?'RWY':'NAV','g'],agl<30?['NAV','b']:null]}
  else if(st==='LVR'){f.c1=[['LVR CLB','w',true]];f.c2=[['SRS','g'],['CLB','b']];f.c3=[['NAV','g']]}
  else if(st==='SRS'){f.c1=[['THR CLB','g']];f.c2=[['SRS','g'],['CLB','b']];f.c3=[['NAV','g']]}
  else if(st==='CLB'){f.c1=[['THR CLB','g']];f.c2=[['CLB','g'],['ALT','b']];f.c3=[['NAV','g']]}
  else if(st==='ALTS'){f.c1=[[FL.mach>0.6?'MACH':'SPEED','g']];f.c2=[['ALT CRZ*','g']];f.c3=[['NAV','g']]}
  else if(st==='CRZ'){f.c1=[[FL.mach>0.6?'MACH':'SPEED','g']];f.c2=[['ALT CRZ','g']];f.c3=[['NAV','g']]}
  else if(st==='DES'){f.c1=[['THR IDLE','g']];f.c2=[['DES','g'],FL.apprPb?['G/S','b']:['ALT','b']];f.c3=[['NAV','g'],FL.apprPb?['LOC','b']:null]}
  else if(st==='ALT'){f.c1=[['SPEED','g']];f.c2=[['ALT','g'],['G/S','b']];f.c3=[[FL.loc||'NAV','g'],FL.loc?null:['LOC','b']]}
  else if(st==='GSS'){f.c1=[['SPEED','g']];f.c2=[['G/S*','g']];f.c3=[[FL.loc||'LOC','g']]}
  else if(st==='GS'){f.c1=[['SPEED','g']];f.c2=[['G/S','g']];f.c3=[['LOC','g']]}
  else if(st==='LAND'){f.c1=[['SPEED','g']];f.land='LAND'}
  else if(st==='FLARE'){f.c1=[[agl<25?'RETARD':'SPEED',agl<25?'w':'g']];f.land='FLARE'}
  else if(st==='ROLLOUT'){f.land='ROLL OUT'}
  if(FL.apprPb&&!['ROLLOUT','STOP'].includes(st)){const q=S.p2;f.c4=[['CAT 3','w'],['DUAL','w'],[q.radio!=null?(q.radio==='NO'?'NO DH':'DH '+q.radio):q.baro!=null?'BARO '+q.baro:'','b']]}
  if(st!=='STOP'){f.c5=[[FL.ap?(FL.apprPb?'AP1+2':'AP1'):'','w'],['1 FD 2','w'],['A/THR',ath]]}
  /* box a mode for 10 s after it changes */
  for(const c of['c1','c2','c3'])if(JSON.stringify(f[c][0])!==JSON.stringify((FL.fma[c]||[])[0]))FL.fmaT[c]=FL.t;
  if(f.land!==FL.fma.land)FL.fmaT.land=FL.t;
  FL.fma=f}

/* ---------- ground elevation (no terrain: airport elevation near each end) ---------- */
function groundElev(){if(!FL.path)return elevO();const o=DB.apt[orig()];return FL.s<FL.path.sThr/2?(o.rwy[S.active.rwy].tdze??o.elev):destRwy().tdze}

/* ---------- one simulation step ---------- */
function step(dt){const P=FL.path,q=S.perf,p2=S.p2,crz=I().crz*100,sp=cfgSpeeds(),gnd=groundElev();
  let agl=FL.alt-gnd;const dtg=P.sThr-FL.s;const st=FL.stage;
  const thr=q.thr??defRed(),acc=q.acc??defRed(),lim=spdLim('clb'),dlim=spdLim('des');
  let tgt=FL.ias,vsT=0;
  if(st==='ROLL'){FL.ias+=3.4*dt;if(FL.ias>=q.vr){FL.pitch=Math.min(15,FL.pitch+3*dt);if(FL.ias>=q.vr+4){FL.ground=false;FL.stage='SRS0'}}vsT=0}
  if(!FL.ground&&FL.stage!=='ROLLOUT'&&FL.stage!=='STOP'){
    if(['SRS0','LVR','SRS'].includes(FL.stage)){tgt=q.v2+10;vsT=2400;
      if(FL.stage==='SRS0'&&FL.alt>=thr){FL.stage='LVR';FL.lvrT=FL.t}
      if(FL.stage==='LVR'&&FL.t-FL.lvrT>4)FL.stage='SRS';
      if(FL.stage==='SRS'&&FL.alt>=acc){FL.stage='CLB';S.phase='CLB'}
      if(!FL.ap&&agl>1000)FL.ap=true}
    if(FL.stage==='CLB'){const cas=FL.alt<lim.alt?lim.spd:mgd.clb(),mmo=iasOf(mgd.crzM()*sos(FL.alt),FL.alt);tgt=Math.min(cas,mmo);
      vsT=FL.alt<10000?2800:FL.alt<25000?2000:1300;if(Math.abs(FL.ias-tgt)>8&&FL.ias<tgt)vsT*=0.5;
      if(crz-FL.alt<800)FL.stage='ALTS'}
    if(FL.stage==='ALTS'||FL.stage==='CRZ'){tgt=iasOf(mgd.crzM()*sos(FL.alt),FL.alt);vsT=Math.max(-1000,Math.min(1000,(crz-FL.alt)*2));
      if(FL.stage==='ALTS'&&Math.abs(crz-FL.alt)<20){FL.alt=crz;FL.stage='CRZ';S.phase='CRZ'}
      if(FL.s>=FL.td){FL.stage='DES';S.phase='DES'}}
    if(FL.stage==='DES'){const pa=profileAlt(dtg);const cas=FL.alt<dlim.alt+1000?dlim.spd:mgd.des(),mmo=iasOf(mgd.crzM()*sos(FL.alt),FL.alt);tgt=Math.min(cas,mmo);
      vsT=Math.max(-3500,Math.min(0,(pa-FL.alt)*3-318*FL.gs/60));if(dtg<=30&&!FL.apprPb)FL.apprPb=true;
      if(Math.abs(FL.alt-faf())<30&&dtg<30){FL.alt=faf();FL.stage='ALT'}}
    if(['ALT','GSS','GS','LAND','FLARE'].includes(FL.stage)||(FL.stage==='DES'&&dtg<25)){
      if(S.phase!=='APPR'&&dtg<25)S.phase='APPR';
      const cf=dtg>20?'0':dtg>13?'1':dtg>10?'2':dtg>8.5?'2':dtg>7?'3':(p2.conf3?'3':'FULL');FL.conf=cf;FL.gear=dtg<10;
      const vapp=p2.vapp??sp.VLS+5;tgt={0:sp.GD,1:sp.S,2:sp.F,3:Math.max(vapp,sp.F-10),FULL:vapp}[cf];
      if(FL.stage==='ALT'){vsT=0;const loc=gc(FL.pos,destRwy().r.pos);if(!FL.loc&&dtg<16)FL.loc='LOC*';if(FL.loc==='LOC*'&&dtg<14)FL.loc='LOC';
        const dgs=(faf()-destRwy().tdze-50)/318;if(dtg<=dgs+0.4){FL.stage='GSS';FL.gssT=FL.t}}
      if(FL.stage==='GSS'||FL.stage==='GS'||FL.stage==='LAND'||FL.stage==='FLARE'){const pa=profileAlt(dtg);vsT=Math.max(-1500,(pa-FL.alt)*4-318*FL.gs/60);
        if(FL.stage==='GSS'&&Math.abs(pa-FL.alt)<30&&FL.t-FL.gssT>8)FL.stage='GS';if(FL.stage==='GS'&&agl<400)FL.stage='LAND';if(FL.stage==='LAND'&&agl<40)FL.stage='FLARE';
        if(FL.stage==='FLARE'){vsT=-Math.max(120,agl*6);tgt=Math.max(vapp-10,FL.ias-1*dt)}}}
    if(FL.stage==='FLARE'&&agl<=1&&FL.vs<=0){FL.ground=true;FL.stage='ROLLOUT';FL.alt=gnd;FL.vs=0;FL.ap=false}}
  if(FL.stage==='ROLLOUT'){FL.ias=Math.max(0,FL.ias-4.5*dt);FL.pitch=Math.max(0,FL.pitch-2*dt);if(FL.ias<=0){FL.stage='STOP';S.phase='DONE';FL.running=false}}
  /* speed and vertical speed dynamics */
  if(!FL.ground&&FL.stage!=='ROLL'){const d=tgt-FL.ias;FL.ias+=Math.max(-1.6*dt,Math.min(1.6*dt,d));FL.vs+=Math.max(-600*dt,Math.min(600*dt,vsT-FL.vs));FL.alt+=FL.vs/60*dt}
  if(FL.ground&&FL.stage!=='ROLL')FL.alt=gnd;
  FL.tas=tasOf(FL.ias,FL.alt-0);FL.gs=FL.ground?FL.ias:FL.tas;FL.mach=FL.tas/sos(FL.alt);
  /* lateral */
  FL.s=Math.min(P.len,FL.s+FL.gs*KT2NMS*dt);const a=posAt(P,FL.s);FL.pos=a.pos;
  let dh=((a.trk-FL.trkT+540)%360)-180;const rate=Math.max(-3,Math.min(3,dh/2));FL.trkT=(FL.trkT+rate*dt+360)%360;FL.hdgT=FL.trkT;
  FL.roll+=Math.max(-5*dt,Math.min(5*dt,(FL.ground?0:rate*8)-FL.roll));
  if(!FL.ground||FL.stage==='ROLLOUT'){const fpa=Math.atan2(FL.vs,Math.max(60,FL.gs)*101.27)/D2R,aoa=FL.conf==='0'?2.5:FL.conf==='FULL'?4:3.5;
    if(FL.stage!=='ROLLOUT')FL.pitch+=Math.max(-2*dt,Math.min(2*dt,(['SRS0','LVR','SRS'].includes(FL.stage)?15:fpa+aoa)-FL.pitch))}
  if(['CLB'].includes(FL.stage)&&FL.conf!=='0'&&FL.ias>sp.S)FL.conf='0';if(['SRS','LVR'].includes(FL.stage)&&FL.ias>sp.F&&FL.conf==='1+F')FL.conf='1';
  if(!FL.ground&&FL.alt-gnd>50)FL.gear=['GSS','GS','LAND','FLARE','ALT'].includes(FL.stage)&&dtg<10;
  /* sequencing: FROM is the last waypoint passed */
  for(const q of P.pts)if(q.ix!=null&&q.s<=FL.s+0.05&&q.ix>FL.fromIx)FL.fromIx=q.ix;
  /* fuel */
  const ff=FL.stage==='ROLL'||FL.stage==='SRS0'?5.6:['LVR','SRS','CLB'].includes(FL.stage)?3.2:['ALTS','CRZ'].includes(FL.stage)?PM.ff(I().crz,I().ci)*PM.wf(gwNowF()):FL.stage==='DES'?0.7:FL.ground?0.4:1.4;
  FL.fob=Math.max(0,FL.fob-ff*dt/3600);
  FL.t+=dt}

/* ---------- loop ---------- */
function flightTick(dtReal){if(!FL.active)return;let dt=dtReal*FL.rate;while(dt>0){const h=Math.min(0.5,dt);step(h);dt-=h;if(!FL.running)break}setFma();refreshAll()}
function refreshAll(){if(typeof render==='function')render();if(window.drawPFD2D)drawPFD2D();flightUI()}
let _lastFrame=null,_acc=0;
function frame(ts){if(FL.active&&FL.running){if(_lastFrame!=null){const d=Math.min(0.25,(ts-_lastFrame)/1000);_acc+=d;if(_acc>=0.1){flightTick(_acc);_acc=0}}}_lastFrame=ts;requestAnimationFrame(frame)}
requestAnimationFrame(frame);
/* run the simulation forward without drawing until a condition is met */
function flightSkip(cond){if(!FL.active)return;let n=0;const r=FL.rate;while(!cond()&&FL.stage!=='STOP'&&n<200000){step(0.5);if(n%20===0)setFma();n++}setFma();refreshAll()}

/* ---------- UTC in flight ---------- */
function simUtcMs(){return FL.utc0+FL.t*1000}
function utcStr(ms){const d=new Date(ms);return String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0')}

/* ---------- control panel ---------- */
function flightUI(){const host=$('#flight');if(!host)return;const miss=FL.active?[]:flightReady();
  const st=$('#flState'),rd=$('#flReady');
  if(st)st.innerHTML=FL.active?`<b>${S.phase}</b><span>${(FL.path.sThr-FL.s).toFixed(0)} NM to go</span><span>${Math.floor(FL.t/60)} min flown</span><span>${FL.conf==='0'?'CLEAN':'CONF '+FL.conf}${FL.gear?' · GEAR DOWN':''}</span>`:`<b>READY TO FLY?</b><span>${miss.length?'Complete first:':'All set. Press START.'}</span>`;
  if(rd){rd.innerHTML=miss.map(m=>`<li>${m}</li>`).join('');rd.hidden=!miss.length||FL.active}
  const b=k=>host.querySelector(`[data-fl="${k}"]`);
  b('start').hidden=FL.active;b('start').disabled=!!miss.length;b('pause').hidden=!FL.active||FL.stage==='STOP';b('pause').textContent=FL.running?'PAUSE':'RESUME';
  b('reset').hidden=!FL.active;host.querySelectorAll('[data-fl^="rate"]').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.fl.slice(5)===FL.rate)));
  ['td','appr'].forEach(k=>b(k).disabled=!FL.active||FL.stage==='STOP')}
function flightBtn(k){
  if(k==='start'){const m=flightStart();if(m.length)S.msg='F-PLN/PERF INCOMPLETE'}
  else if(k==='pause'){FL.running=!FL.running}
  else if(k==='reset')flightReset();
  else if(k.startsWith('rate'))FL.rate=+k.slice(5);
  else if(k==='td')flightSkip(()=>FL.s>=FL.td-3);
  else if(k==='appr')flightSkip(()=>FL.path.sThr-FL.s<=22);
  refreshAll()}
{const host=$('#flight');if(host)host.querySelectorAll('[data-fl]').forEach(b=>b.addEventListener('click',()=>flightBtn(b.dataset.fl)))}
window.__FL=FL;window.__flight=flightBtn;window.__flSkip=flightSkip;
