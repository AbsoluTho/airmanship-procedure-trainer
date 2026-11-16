'use strict';
/* ================= automatic flight, guided by the FCU and the FMGS =================
   A procedure trainer, not a flight model. The aircraft is steered by the engaged
   lateral and vertical modes (NAV, HDG/TRK, LOC, RWY; SRS, CLB, OP CLB, DES, OP DES,
   V/S, FPA, ALT, G/S...) and holds the managed or selected speed. Without an AP the
   pilot is assumed to follow the FD. Mode names follow the FlyByWire A32NX FMA.
   Figures are approximations for training the procedures only. */
const FL={active:false,running:false,rate:1,t:0,utc0:0,path:null,s:0,seg:1,xtk:0,pos:null,hdgT:0,trkT:0,roll:0,pitch:0,alt:0,vs:0,ias:0,tas:0,gs:0,mach:0,ground:true,
  lat:'RWY',latArm:null,ver:'SRS',verArm:[],thr:'TO',conf:'1+F',gear:true,fob:0,fromIx:0,td:null,tdReached:false,loc:false,gsCap:false,
  fma:{c1:[],c2:[],c3:[],c4:[],c5:[]},fmaT:{},stage:'IDLE'};
const KT2NMS=1/3600;

/* ---------- lateral path from the F-PLN ---------- */
function buildPath(plan){const p=plan||S.active,pts=[],holds=[];let vr=DB.apt[p.legs[0].id].var||0;
  const push=(pos,ix)=>{const last=pts[pts.length-1];if(last&&gc(last.p,pos)<0.01){if(ix!=null)last.ix=ix;return}pts.push({p:pos,ix})};
  let tp=-1;p.legs.forEach((l,i)=>{if(l.k==='tp')tp=i});   /* after a DIR TO the path starts at the turn point */
  for(let ix=Math.max(0,tp);ix<p.legs.length;ix++){const l=p.legs[ix];
    if(l.k==='tp'){push(l.pos,ix);dirArc(p,ix).forEach(q=>push(q,null));continue}
    if(l.seg==='map')break;
    /* go-around heading leg: the heading flown until its altitude (about 600 ft per NM) */
    if(l.k==='hdg'&&pts.length){const c=+((String(l.lbl).match(/(\d{3})/)||[0,0])[1]),vd=DB.apt[p.legs[idxK(p,'dest')].id].var||0,from=flying()?FL.alt:0,L=l.alt?Math.max(2,(l.alt.v-from)/600):5;
      push(dst(pts[pts.length-1].p,c+vd,L),ix);continue}
    if(l.k==='orig'){const ap=DB.apt[l.id],r=ap.rwy[l.rwy];vr=ap.var||0;push(r.pos,ix);push(dst(r.pos,r.crs+vr,Math.min(1.6,r.len/1852*0.7)),null);continue}
    /* climb leg (e.g. (1526) after NO SID): drawn on runway track, at most 3 NM past the runway end, clear of the waypoints that follow */
    if(l.k==='ca'){const o=p.legs[0],ap=DB.apt[o.id],r=ap.rwy[o.rwy];push(dst(r.pos,r.crs+vr,r.len/1852+Math.min(3,l.aal/320)),ix);continue}
    if(l.k==='wpt'){const pos=DB.wpt[l.id];if(!pos)continue;const prev=pts[pts.length-1];
      if(l.lbl==='ARC'&&l.ctr&&DB.wpt[l.ctr]&&prev)arcPts(prev.p,pos,DB.wpt[l.ctr]).slice(1,-1).forEach(q=>push(q,null));
      push(pos,ix);continue}
    /* pilot-entered hold (HOLD page): one racetrack circuit after its fix, repeated in flight until the exit */
    if(l.k==='hold'&&l.fix&&pts.length){const F=pts[pts.length-1],crsT=l.crs+(l.seg==='ga'?(DB.apt[p.legs[idxK(p,'dest')].id].var||0):vr),right=l.turn!=='L';
      const R=holdR(l),L=holdLen(l),trkIn=pts.length>1?brg(pts[pts.length-2].p,F.p):null,en=holdEntry(F.p,trkIn,crsT,right,L,R);
      Object.assign(l,{_R:R,_L:L,_entry:en.type});F.he=ix;let H0=F;   /* entry (teardrop, parallel) between the first and second passage of the fix */
      if(en.pts.length){en.pts.forEach(q=>pts.push({p:q,ix:null}));H0={p:F.p.slice(),ix:null};pts.push(H0)}
      const loop=holdLoop(H0.p,crsT,right,L,R);H0.h0=ix;loop.slice(1).forEach((q,k)=>{pts.push({p:q,ix:k===loop.length-2?ix:null})});pts[pts.length-1].h1=ix;holds.push(ix);continue}
    if(l.k==='dest'){const ap=DB.apt[l.id],r=ap.rwy[l.rwy];if(!r){push(ap.pos,ix);break}push(r.pos,ix);push(dst(r.pos,r.crs+(ap.var||0),r.len/1852*0.75),null);break}}
  if(p.ofst)offsetPts(pts,p);
  let s=0;pts.forEach((q,i)=>{if(i)s+=gc(pts[i-1].p,q.p);q.s=s});
  const thr=pts.find(q=>q.ix!=null&&p.legs[q.ix].k==='dest')||pts[pts.length-1];
  const H=holds.map(ix=>{const i0=pts.findIndex(q=>q.h0===ix),i1=pts.findIndex(q=>q.h1===ix),ie=pts.findIndex(q=>q.he===ix);return{ix,i0,s0:pts[i0].s,s1:pts[i1].s,sE:ie>=0?pts[ie].s:pts[i0].s}}).filter(h=>h.i0>=0);
  const oe=pts.find(q=>q.oe),os_=pts.find(q=>q.os);
  return{pts,len:s,sThr:thr.s,holds:H,ofstEnd:oe?oe.s:null,ofstStart:os_?os_.s:null}}
/* DIR TO (FlyByWire DF leg geometry): from the turn point, a turn on the track flown when DIR TO was inserted, at the
   radius the aircraft can fly at that ground speed (2.5 deg/s), until the aircraft points at the waypoint; then a straight
   line, tangent to the turn. No overshoot and no reverse turn. Empty when the turn is not needed or cannot reach it. */
function dirArc(p,ix){const l=p.legs[ix];if(l.trk==null)return[];
  const nx=p.legs.slice(ix+1).find(q=>(q.k==='wpt'&&!q.ab)||q.k==='dest');if(!nx)return[];
  const tgt=nx.k==='wpt'?DB.wpt[nx.id]:(()=>{const a=DB.apt[nx.id],r=nx.rwy&&a.rwy[nx.rwy];return r?r.pos:a.pos})();if(!tgt)return[];
  const rel=((brg(l.pos,tgt)-l.trk+540)%360)-180;if(Math.abs(rel)<3)return[];
  const side=rel>0?1:-1,R=Math.max(0.5,(l.gs||250)/3600/(2.5*D2R)),C=dst(l.pos,l.trk+90*side,R);
  if(gc(C,tgt)<R*1.05)return[];   /* the waypoint is inside the turn circle */
  const pts=[];for(let k=1;k<=72;k++){const h=l.trk+side*5*k,q=dst(C,h-90*side,R);pts.push(q);
    if(Math.abs(((brg(q,tgt)-h+540)%360)-180)<=5)break}
  return pts}
const planSig=()=>{const p=S.active;return p?p.legs.map(l=>l.k+(l.id||'')+(l.rwy||'')+(l.k==='hold'?[l.crs,l.turn,l.time,l.dist].join(','):'')).join('|')+(p.appr||'')+(p.ofst?'|OFST'+p.ofst.side+p.ofst.nm:''):''};
/* the active F-PLN changed in flight (DIR TO, ENABLE ALTN, new approach...): rebuild the path from the present position */
function flightReplan(){const P=buildPath();FL.path=P;
  /* the FROM floor: after a DIR TO the T-P (or the RADIAL IN point); after a SEC activated in flight, the legs already flown */
  let f0=0;{const ti=S.active.legs.reduce((a,l,i)=>l.k==='tp'?i:a,-1);if(ti>=0)f0=ti;const fl=S.active.flownIx;if(fl!=null&&fl>=0&&fl<S.active.legs.length)f0=Math.max(f0,fl)}
  let i0=1;if(f0>0){let k=-1;P.pts.forEach((q,i)=>{if(q.ix!=null&&q.ix<=f0)k=i});if(k>=0)i0=Math.min(P.pts.length-1,k+1)}
  const pr=project(P,FL.pos,i0,P.pts.length-1);FL.s=pr?pr.s:0;FL.seg=pr?pr.i:1;FL.fromIx=f0;
  /* sequencing area (FBW LnavDriver): the nearest part of the path counts only within 7 NM and 90 deg of it (RADIAL IN: the final course
     near the aircraft is not sequenced); otherwise the distance runs direct to the TO waypoint */
  if(pr&&!['NAV','RWY','RWY TRK','LOC*','LOC','LAND','ROLL OUT'].includes(FL.lat)&&!FL.ground){const a=P.pts,A=a[pr.i-1],B=a[pr.i],tae=Math.abs(((brg(A.p,B.p)-FL.trkT+540)%360)-180);
    if(Math.abs(pr.xtk)>=7||tae>=90){const k=a.findIndex(q=>q.ix!=null&&q.ix>FL.fromIx);if(k>0){FL.s=Math.min(pr.s,a[k].s-gc(FL.pos,a[k].p));FL.seg=k}}}
  for(const pt of P.pts)if(pt.ix!=null&&pt.s<=FL.s+0.05&&pt.ix>FL.fromIx)FL.fromIx=pt.ix;FL.td=P.sThr-tdDist();FL.sig=planSig();FL.tdReached=false}
function posAt(P,s){const a=P.pts;let i=1;while(i<a.length-1&&a[i].s<s)i++;const A=a[i-1],B=a[i],f=Math.max(0,Math.min(1,(s-A.s)/((B.s-A.s)||1)));
  return{pos:[A.p[0]+(B.p[0]-A.p[0])*f,A.p[1]+(B.p[1]-A.p[1])*f],trk:brg(A.p,B.p),i}}
/* track angle error to the path segment of a projection (NAV engages only within 90 deg of the leg, not across it the wrong way) */
const navTae=(P,pr)=>{const A=P.pts[pr.i-1],B=P.pts[pr.i];return A&&B?Math.abs(((brg(A.p,B.p)-FL.trkT+540)%360)-180):0};
/* NAV capture from HDG/TRK (FBW LnavDriver computeNavCaptureCondition): only the active leg (FROM to TO) can be captured. Converging, the
   capture zone grows with the intercept angle from the turn radius at 25 deg of bank (at least 0.3 NM); diverging, within two turn radii. */
function navCapture(P){const a=P.pts,iT=a.findIndex(q=>q.ix!=null&&q.ix>FL.fromIx);if(iT<1)return false;let iF=0;for(let i=0;i<iT;i++)if(a[i].ix!=null&&a[i].ix<=FL.fromIx)iF=i;
  const q=project(P,FL.pos,Math.max(1,iF+1),iT);if(!q)return false;const A=a[q.i-1],B=a[q.i],c=brg(A.p,B.p),e=enu(A.p,FL.pos);
  const xte=e[0]*Math.cos(c*D2R)-e[1]*Math.sin(c*D2R),tae=((FL.trkT-c+540)%360)-180,v=Math.max(150,FL.tas)/1.94384,R=v*v/(9.81*Math.tan(25*D2R))/1852;
  if(xte*tae>0)return q.d<2*R&&Math.abs(tae)<90;
  /* our lateral law rolls in more gently than FBW's path law, so the lead is the full turn: radius x (1 - cos intercept angle) */
  return q.d<Math.max(0.3,R*(1-Math.cos(Math.min(180,Math.abs(tae))*D2R))+0.2)}
/* local flat projection around a point (NM) */
function enu(o,p){return[(p[1]-o[1])*60*Math.cos(o[0]*D2R),(p[0]-o[0])*60]}
/* closest point on the path: along-track distance and cross-track (+ right of track) */
/* nearest point of the path: d = distance to the segment itself (NAV capture), xtk = signed distance to its line (guidance) */
function project(P,pos,from,to){let best=null;const a=P.pts;
  for(let i=Math.max(1,from);i<=Math.min(a.length-1,to);i++){const A=a[i-1],B=a[i],b=enu(A.p,B.p),q=enu(A.p,pos),L2=b[0]*b[0]+b[1]*b[1]||1e-9;
    let f=(q[0]*b[0]+q[1]*b[1])/L2;f=Math.max(0,Math.min(1,f));const dx=q[0]-b[0]*f,dy=q[1]-b[1]*f,d=Math.hypot(dx,dy);
    if(!best||d<best.d){const L=Math.sqrt(L2);best={d,s:A.s+f*L,i,xtk:(b[0]*q[1]-b[1]*q[0])/L*-1}}}
  return best}

/* ---------- final approach course (LOC) ---------- */
function destRwy(){const p=S.active,d=p.legs[idxK(p,'dest')],a=DB.apt[d.id],r=a.rwy[d.rwy]||Object.values(a.rwy)[0]||{pos:a.pos,crs:0,len:2000};return{a,r,tdze:r.tdze??a.elev}}   /* NEW DEST without a runway yet: the first runway */
function locGeo(pos){const d=destRwy(),g=c=>{const q=enu(d.r.pos,pos),u=[Math.sin(c*D2R),Math.cos(c*D2R)];return{crs:c,along:-(q[0]*u[0]+q[1]*u[1]),xtk:(u[0]*q[1]-u[1]*q[0])*-1}};   /* along: NM before the threshold */
  const v=d.a.var||0,r=g(d.r.crs+v),p=S.active,ap=p&&p.appr&&!/^(ILS|LOC)/.test(p.appr)&&(APPRS[destId()]||{})[p.appr];
  /* VOR/RNP final on its own course (an offset final, e.g. VOR 31 on 311 to runway 306) down to 1 NM, then the runway centreline */
  return ap&&ap.crs!=null&&ap.crs!==d.r.crs&&r.along>1?g(ap.crs+v):r}
function faf(){const p=S.active,di=idxK(p,'dest');for(let i=di-1;i>0;i--){const l=p.legs[i];if(l.k==='wpt'&&l.alt&&l.seg==='arr')return l.alt.v}return destRwy().tdze+1500}
function gsAlt(dtg){return destRwy().tdze+50+318*Math.max(0,dtg)}
/* profileAlt() and tdDist() (constrained descent path, T/D) are in vnav.js */
const hasLs=()=>{const p=S.active;return!!(p&&p.appr&&(APPRS[destId()]||{})[p.appr])};   /* a published approach: ILS/LOC, or VOR/RNP flown as APP NAV and FINAL */
const npaAppr=()=>{const p=S.active;return!!(hasLs()&&!/^(ILS|LOC)/.test(p.appr))};

/* ---------- atmosphere and speeds ---------- */
const tasOf=(ias,alt)=>ias*(1+alt/1000*0.02);
const iasOf=(tas,alt)=>tas/(1+alt/1000*0.02);
const sos=alt=>661.47*Math.sqrt(Math.max(216.65,288.15-1.98*alt/1000)/288.15);
function gwNowF(){return S.fuel.zfw+FL.fob}
/* managed speed of the configuration set (approach phase, hold with flaps): green dot clean, S with flaps 1, F with flaps 2,
   the higher of Vapp and F - 10 with flaps 3, Vapp with flaps FULL */
/* VAPP as on PERF APPR: the pilot's entry, else VLS + 1/3 of the headwind on the landing runway (5 to 15 kt) */
function vappNow(sp,p2){if(p2.vapp!=null)return p2.vapp;const a=S.active,dl=a&&a.legs[idxK(a,'dest')],ap=dl&&DB.apt[dl.id],r=ap&&ap.rwy[dl.rwy];
  const hw=p2.wdir!=null&&r?Math.max(0,p2.wspd*Math.cos((p2.wdir-r.crs)*D2R)):0;return Math.round(sp.VLS)+Math.round(Math.min(15,Math.max(5,hw/3)))}
function apprCfgSpd(sp,p2){const vapp=vappNow(sp,p2);return{'0':sp.GD,'1':sp.S,'1+F':sp.S,'2':sp.F,'3':Math.max(vapp,sp.F-10),FULL:vapp}[FL.conf]??sp.GD}
function cfgSpeeds(){const w=gwNowF(),cs=charSpeeds(w);return{GD:cs.O,S:cs.S,F:cs.F,VLS:vls(w,S.p2.conf3)}}
/* ground elevation: the airport nearer the aircraft (origin runway or destination runway) */
function groundElev(){if(!FL.path)return elevO();const o=DB.apt[orig()],d=destRwy(),pos=FL.pos||o.pos;return gc(pos,o.pos)<gc(pos,d.r.pos)?(o.rwy[S.active.rwy].tdze??o.elev):d.tdze}

/* ---------- readiness ---------- */
/* minimum to start: an active F-PLN with a departure runway, INIT A, INIT B and PERF TAKE OFF (and the FCU initial clearance) */
function flightReady(){const a=S.active,i=I(),q=S.perf,f=S.fuel,miss=[];
  if(!a)miss.push('INIT A: FROM/TO');else if(!a.rwy)miss.push('F-PLN: departure runway');
  if(!i.flt)miss.push('INIT A: FLT NBR');if(i.ci==null)miss.push('INIT A: COST INDEX');
  if(!i.crz)miss.push('INIT A: CRZ FL');if(f.zfw==null||f.block==null)miss.push('INIT B: ZFW/ZFWCG and BLOCK');
  if(!q.flaps)miss.push('PERF TAKE OFF: FLAPS/THS');
  if(FCU.alt<=elevO()+400)miss.push('FCU: altitude above the airfield (initial clearance)');
  return miss}

/* ---------- start, reset ---------- */
/* V speeds: the pilot's entries are used as entered (any order); a blank one is computed from the take-off weight */
function vFill(){const q=S.perf,f=S.fuel,tow=(f.zfw||58)+(f.block||8)-(f.taxi??0.2),v2=q.v2||Math.round(150*Math.sqrt(tow/66.8));
  if(!q.v2)q.v2=v2;if(!q.vr)q.vr=Math.min(q.v2,v2-4);if(!q.v1)q.v1=Math.min(q.vr,v2-9)}
function flightStart(){const miss=flightReady();if(miss.length)return miss;vFill();WX.surface={};
  cockpitAudio.reset();
  const P=buildPath(),o=DB.apt[orig()],r=o.rwy[S.active.rwy],tr=r.crs+(o.var||0);
  Object.assign(FL,{active:true,running:true,t:0,utc0:Date.now(),path:P,s:0,seg:1,xtk:0,pos:r.pos,hdgT:tr,trkT:tr,roll:0,pitch:0,alt:r.tdze??o.elev,vs:0,ias:0,tas:0,gs:0,mach:0,
    ground:true,lat:'RWY',latArm:FCU.hdgMgd&&!S.active.noSid&&!(S.active.legs[1]&&S.active.legs[1].k==='disc')?'NAV':null,ver:'SRS',verArm:[FCU.lvlch?'CLB':'OP CLB'],thr:'IDLE',conf:['0','1+F','2','3','FULL'][LV.flaps],gear:true,gearPos:1,gaFlap:false,pmGearT:null,pmF3T:null,revDone:false,
    fob:S.fuel.block-(S.fuel.taxi??0.2),fromIx:0,loT:null,spdLimOn:false,eoEng:null,crzDes:false,ldgSeq:0,gearT:null,f3T:null,inHold:null,holdExit:null,hsActive:null,cst:null,acc:0,accT:0,soe:false,opSmall:false,spdIsMach:false,capAlt:null,altHold:null,fmaT:{},loc:false,gsCap:false,tdReached:false,stage:'LINEUP',lvrT:null});LV.thr='IDLE';LV.gear='DOWN';LV.decel=false;LV.m1=LV.m2=true;
  FCU.athr=true;FL.td=P.sThr-tdDist();FL.sig=planSig();S.phase='TAKEOFF';setFma();flightTick(0);return[]}
function q2conf(){const f=S.perf.flaps;return f===1?'1+F':String(f||1)}

/* ---------- LEVERS: thrust levers, flaps lever, landing gear lever, autobrake (the pilot's commands) ---------- */
const LV={thr:'IDLE',flaps:0,spb:0,gsArm:false,gear:'DOWN',abrk:null,fan:false,askid:true,decel:false,m1:false,m2:false};
const VFE={'0':999,'1':230,'1+F':215,'2':200,'3':185,'FULL':177},VLE=280;
let PM_AUTO=false;   /* test hook: a pilot monitoring that moves the levers (off in the app) */
function lever(k,v){
  if(k==='thr'){if(!['IDLE','REVIDLE','REVMAX','N50','CL','FLX','TOGA'].includes(v))return;
    if(v.startsWith('REV')&&FL.active&&!FL.ground)return;   /* no reverse in flight; on the ground the levers go into the REV zone (reverse thrust acts on the landing roll) */
    const prev=LV.thr;
    LV.thr=v;if(!FL.active)return;
    if(FL.stage==='LINEUP'&&(v==='FLX'||v==='TOGA')){FL.stage='ROLL';FL.thr='TO'}   /* the take-off roll starts at FLX/MCT or TOGA */
    else if(FL.stage==='AIR'){
      if(v==='TOGA'&&FL.thr==='GA SOFT'){FL.thr='TO';setFma()}
      else if(v==='TOGA'&&!['TO','LVR'].includes(FL.thr))goAround();
      else if(v==='FLX'&&prev==='TOGA'&&FL.thr==='TO'&&S.phase==='GA'&&FL.ver==='SRS'&&!FL.eoEng){
        FL.thr='GA SOFT';
        setFma();
      }
      else if(v==='CL'&&['TO','GA SOFT','LVR','MCT'].includes(FL.thr)){
        const wasSoft=FL.thr==='GA SOFT';
        FL.thr='CL';
        if(wasSoft)setFma();
      }
      else if(v==='FLX'&&!['TO','GA SOFT'].includes(FL.thr))FL.thr='MCT';
    }}
  else if(k==='flaps'){const n=+v;if(n>=0&&n<=4)LV.flaps=n}
  else if(k==='spb'){const n=+v;if(n>=0&&n<=1){LV.spb=n<0.03?0:n>0.97?1:n;if(LV.spb>0)LV.gsArm=false}}   /* speed brake lever: any position from RET (0) to FULL (1); out of RET the ground spoilers are not armed */
  else if(k==='gsarm'){if(LV.spb===0)LV.gsArm=v==='toggle'?!LV.gsArm:v===true||v==='1'||v==='on'}   /* ground spoilers armed (lever pulled up), at RET only */
  else if(k==='gear'){if(v==='UP'&&FL.active&&FL.ground)return;LV.gear=v}   /* weight on wheels: no gear up on the ground */
  else if(k==='abrk')LV.abrk=LV.abrk===v?null:v;
  else if(k==='master'){if(FL.active)return;LV['m'+v]=!LV['m'+v]}
  else if(k==='mode'){if(typeof engMode==='function')engMode(v);return}   /* engines running in flight: masters stay ON */
  else if(k==='fan')LV.fan=!LV.fan;
  else if(k==='askid')LV.askid=!LV.askid;
  if(typeof refreshAll==='function')refreshAll()}
/* flaps lever position to configuration: lever 1 is 1+F on the ground and when retracting below 210 kt; 1+F becomes 1 above 210 kt */
function lvConf(){const n=LV.flaps;if(n!==1)return['0','1+F','2','3','FULL'][n];
  if(FL.conf==='1+F')return FL.ias>210&&!FL.ground?'1':'1+F';if(FL.conf==='1')return'1';
  return FL.ground||(FL.conf!=='0'&&FL.ias<210)?'1+F':'1'}
function lvStep(dt){FL.conf=lvConf();
  const tg=FL.ground?1:(LV.gear==='DOWN'?1:0);FL.gearPos=Math.max(0,Math.min(1,(FL.gearPos??1)+Math.sign(tg-(FL.gearPos??1))*dt/10));FL.gear=FL.gearPos>0}
/* test-only pilot monitoring: the lever actions of the earlier automatic profile */
function autoPM(dtg,sp){const st=FL.stage,h=FL.alt-groundElev();
  if(st==='LINEUP'){if(LV.flaps!==(S.perf.flaps||1)){lever('flaps',S.perf.flaps||1);return}lever('thr',LV.thr==='IDLE'?'N50':(S.perf.flex!=null?'FLX':'TOGA'));return}
  if(st==='ROLLOUT'){if(LV.thr==='IDLE'&&FL.ias>70&&!FL.revDone)lever('thr','REVMAX');else if(LV.thr==='REVMAX'&&FL.ias<=70){lever('thr','IDLE');FL.revDone=true}return}
  if(st!=='AIR')return;
  if(FL.thr==='LVR'&&LV.thr!=='CL')lever('thr','CL');
  if(FL.ver==='FLARE'&&h<25&&LV.thr!=='IDLE')lever('thr','IDLE');
  if(S.phase==='GA'&&!FL.gaFlap){FL.gaFlap=true;if(LV.flaps>0)lever('flaps',LV.flaps-1)}
  if(LV.gear==='DOWN'&&FL.vs>300&&h>50&&S.phase!=='APPR')lever('gear','UP');
  if(S.phase==='APPR'){if(!LV.abrk)lever('abrk','MED');let n=LV.flaps;if(dtg<=12)n=Math.max(n,1);if(dtg<=8)n=Math.max(n,2);
    if(dtg<=6&&LV.gear!=='DOWN'){lever('gear','DOWN');FL.pmGearT=FL.t}
    if(FL.pmGearT!=null&&FL.t-FL.pmGearT>=5&&n<3){n=3;FL.pmF3T=FL.t}if(FL.pmF3T!=null&&!S.p2.conf3&&FL.t-FL.pmF3T>=3)n=4;
    if(n!==LV.flaps)lever('flaps',n)}
  else if(h>400){let n=LV.flaps;if(FL.ias>=sp.S-2)n=0;else if(FL.ias>=sp.F-2)n=Math.min(n,1);if(n!==LV.flaps)lever('flaps',n)}}
function flightReset(){S.eo=false;Object.assign(FL,{active:false,running:false,eoEng:null,path:null,stage:'IDLE',fma:{c1:[],c2:[],c3:[],c4:[],c5:[]},ias:0,gs:0,tas:0,vs:0});
  cockpitAudio.reset();
  FCU.ap1=FCU.ap2=FCU.athr=FCU.loc=FCU.appr=FCU.exped=false;if(FCU.spdMgd)FCU.mach=false;S.phase='PREFLIGHT';S.apprArm=false;refreshAll()}

/* ---------- go-around (thrust levers to TOGA) ----------
   MAN TOGA, SRS, GA TRK with NAV armed; GA phase. The missed approach becomes the active route (green) from the go-around point,
   and the approach is strung again after it (behind a discontinuity), to be flown once the approach phase is activated again. */
const DECEL_NM=25;
/* ---- deceleration at idle (kt lost per NM flown), from the configuration and the rate of descent ----
   gear up (clean, CONF 1, CONF 2): level 10, 1000 ft/min down 5, 2000 ft/min down 0;
   gear down: 5 more (15, 10, 5); landing configuration (CONF 3 or FULL with the gear down): 10 more (20, 15, 10);
   steeper, the speed increases even at idle, in proportion to the rate of descent: 5 kt per NM for each 1000 ft/min more
   (gear up: 5 at 3000 ft/min, 10 at 4000 ft/min).
   The rates of descent are those of a ground speed of 250 kt or less; faster, the same descent gradient counts
   (a 3 degree path gives the same deceleration at 250 kt and at cruise speed). In a climb the speed is lost faster. */
function idleBase(){return 10+(FL.gear?(FL.conf==='3'||FL.conf==='FULL'?10:5):0)}
/* speed brakes actually extended (0 to 1) for the lever position: not in CONF FULL (inhibited), half at the most with the autopilot engaged */
function spbEff(){if(!FL.active||FL.ground||FL.conf==='FULL')return 0;return Math.min(LV.spb||0,FCU.ap1||FCU.ap2?0.5:1)}
/* speed brakes add drag: half 50 % more, full 100 % more than the drag of the configuration (the level deceleration), so with full speed brakes
   clean: level 20, 1000 ft/min down 15, 2000 ft/min down 10, no deceleration at 4000 ft/min; the speed increases past that rate */
function idleDecel(vs,gs){const base=idleBase()*(1+spbEff()),v=-vs*Math.min(1,250/Math.max(1,gs));
  return Math.max(-30,Math.min(60,base-v/200))}
/* the rate of descent (ft/min, positive down) that gives a deceleration of r kt per NM at idle (r negative: an acceleration) */
function idleVs(r,gs){const base=idleBase()*(1+spbEff()),k=Math.max(1,gs/250);r=Math.max(-30,Math.min(base,r));
  return(base-r)*200*k}
/* distance (NM) needed to lose dv kt at idle on the present path */
function decelLead(dv){return Math.max(0,dv)/Math.max(2.5,idleDecel(Math.min(0,FL.vs),FL.gs))}
function gaLeg(l){l.seg='ga';if(l.k==='hold'&&!l.fix)return null;return l}
function goAround(){if(!FL.active||FL.ground||FL.stage!=='AIR'||!['APPR','DES'].includes(S.phase))return false;
  cockpitAudio.reset();
  const p=S.active,di=idxK(p,'dest'),map=p.legs.slice(di+1).filter(l=>l.seg==='map');
  if(map.length){const arr=p.legs.filter((l,i)=>i<di&&l.seg==='arr'),ga=[];
    map.forEach((l,i)=>{const c=clone(l);c.seg='ga';if(c.k==='hold'){const fx=map[i-1];const m=String(c.lbl||'').match(/(\d{3})/);
      Object.assign(c,{fix:fx&&fx.id,crs:m?+m[1]:360,turn:/L$/.test(c.id)?'L':'R',time:1,dist:null,type:'DATABASE'});c.def={crs:c.crs,turn:c.turn,time:1,dist:null,type:'DATABASE'};holdName(c)}ga.push(c)});
    const tp={k:'tp',id:'T-P',pos:FL.pos.slice(),seg:'ga'};
    p.legs=[...p.legs.slice(0,di),tp,...ga,{k:'disc'},...clone(arr),clone(p.legs[di]),...clone(map)]}
  S.phase='GA';S.apprArm=false;FL.thr='TO';FL.lvrT=null;FL.ver='SRS';FL.verArm=FCU.alt>FL.alt+250?['CLB']:[];FL.lat='GA TRK';FL.latArm=map.length?'NAV':null;FL.gaTrk=FL.trkT;
  FL.gaSpd=Math.max(FL.ias,vappNow(cfgSpeeds(),S.p2));FL.loc=false;FL.gsCap=false;FCU.appr=false;FCU.loc=false;FL.ldgSeq=0;FL.tdReached=false;FL.gaT=FL.t;
  FL.conf=FL.conf==='FULL'?'3':FL.conf==='3'?'1+F':FL.conf;if(FL.alt-groundElev()<5)FL.alt=groundElev()+5;
  flightReplan();setFma();refreshAll();return true}

/* ---------- FCU actions arriving in flight ---------- */
const CLIMBING=['CLB','OP CLB','EXP CLB'],DESCENDING=['DES','OP DES','EXP DES'];
function fcuEvent(ev){if(!FL.active)return;const A=FCU.alt;
  if(ev!=='spd-pull')FL.opSmall=Math.abs(A-FL.alt)<1200;   /* level change under 1200 ft: V/S 1000 ft/min with A/THR on speed (Airbus OPEN mode logic) */
  if(ev==='alt-pull'){if(FL.ground)return;if(Math.abs(A-FL.alt)<250)return;FL.ver=A>FL.alt?'OP CLB':'OP DES';FL.verArm=['ALT']}
  if(ev==='alt-push'){if(FL.ground){FL.verArm=['CLB'];return}if(Math.abs(A-FL.alt)<250)return;
    if(A>FL.alt){FL.ver='CLB';FL.verArm=['ALT']}else{FL.ver='DES';FL.verArm=['ALT']}}   /* before T/D: early descent at 1000 ft/min until the path */
  if(ev==='vs-pull'){if(FL.ground)return;FL.ver=FCU.trkFpa?'FPA':'V/S';FL.verArm=['ALT']}
  if(ev==='vs-push'){if(FL.ground)return;FL.ver=FCU.trkFpa?'FPA':'V/S';FCU.vsVal=0;FCU.fpa=0;FL.verArm=[]}
  if(ev==='hdg-pull'){if(FL.ground){FL.latArm=null;return}FL.lat=FCU.trkFpa?'TRK':'HDG';FL.latArm=null}
  if(ev==='hdg-push'){if(FL.ground){FL.latArm='NAV';return}const pr=project(FL.path,FL.pos,1,FL.path.pts.length-1);
    if(pr&&pr.d<0.3){FL.lat='NAV';FL.latArm=null;FL.seg=pr.i;FL.s=pr.s}else FL.latArm='NAV'}
  /* EXPED: engages EXP CLB or EXP DES toward the FCU altitude; pressed again, back to OP CLB or OP DES */
  if(ev==='exped'){if(FL.ground)return;if(FL.ver==='EXP CLB')FL.ver='OP CLB';else if(FL.ver==='EXP DES')FL.ver='OP DES';
    else if(Math.abs(A-FL.alt)>=250){FL.ver=A>FL.alt?'EXP CLB':'EXP DES';FL.verArm=['ALT'];FL.opSmall=false}}
  /* selecting a speed leaves the expedite mode (its speed target is fixed): OP CLB or OP DES */
  if(ev==='spd-pull'){if(FL.ver==='EXP CLB')FL.ver='OP CLB';else if(FL.ver==='EXP DES')FL.ver='OP DES'}
  expedSync();setFma();refreshAll()}
/* the EXPED light is on only while EXP CLB or EXP DES is the active vertical mode (FlyByWire FcuComputer: exped_light_on = expedite mode
   reported active by the FMGC), so it goes off as soon as any other vertical mode takes over */
function expedSync(){FCU.exped=FL.active&&!FL.ground&&(FL.ver==='EXP CLB'||FL.ver==='EXP DES')}

/* ---------- FMA (mode strings from the FlyByWire A32NX FMA) ---------- */
function setFma(){const st=FL.stage,a=S.perf,fx=a.flex!=null&&S.phase!=='GA'?'FLX '+a.flex:'TOGA',f={c1:[],c2:[],c3:[],c4:[],c5:[]};
  const guide=EFIS.fd||FCU.ap1||FCU.ap2;
  const fx2=LV.thr==='TOGA'||S.phase==='GA'?'TOGA':(a.flex!=null?'FLX '+a.flex:'MCT');
  if(st==='LINEUP'){f.c1=[]}
  else if(FL.thr==='TO'&&st!=='IDLE'){f.c1=[['MAN','w'],[fx2,'w']]}
  else if(FL.thr==='GA SOFT'){f.c1=[['MAN','w'],['GA SOFT','w']]}
  else if(FL.thr==='MCT'){f.c1=[['MAN','w'],['MCT','w']]}
  else if(FL.thr==='LVR'){f.c1=[['LVR CLB','w',true]]}
  else if(FCU.athr&&!['ROLLOUT','STOP','IDLE'].includes(st)){
    if(FL.ver==='FLARE'&&FL.alt-groundElev()<25)f.c1=[['RETARD','w']];
    else if(CLIMBING.includes(FL.ver)||FL.ver==='SRS')f.c1=[['THR CLB','g']];
    else if(DESCENDING.includes(FL.ver))f.c1=[['THR IDLE','g']];
    else f.c1=[[FL.spdIsMach?'MACH':'SPEED','g']]}
  if(guide&&st!=='IDLE'){
    if(['LAND','FLARE','ROLL OUT'].includes(FL.ver))f.land=FL.ver;
    /* lined up: SRS and RWY engage only when the thrust levers are set to FLX/MCT or TOGA; until then the armed modes only */
    else if(st==='LINEUP'){f.c2=[null,FL.verArm.length?[FL.verArm.join(' '),'b']:null];f.c3=[null,FL.latArm?[FL.latArm,'b']:null]}
    else{const crzAlt=FCU.alt===I().crz*100&&FL.alt>20000;
      const sg=v=>v>0?'+'+v:v<0?'-'+Math.abs(v):'0';   /* V/S +1500, V/S -500, V/S 0; FPA +3.0° */
      const vtxt=FL.ver==='V/S'?'V/S '+sg(Math.round(FCU.vsVal||0)):FL.ver==='FPA'?'FPA '+(FCU.fpa>0?'+':FCU.fpa<0?'-':'')+Math.abs(FCU.fpa||0).toFixed(1)+'°':FL.ver;
      f.c2=[[FL.ver==='ALT'&&crzAlt?'ALT CRZ':FL.ver==='ALT*'&&crzAlt?'ALT CRZ*':vtxt,'g'],FL.verArm.length?[FL.verArm.join(' '),cstArmed()?'m':'b']:null];
      f.c3=[[FL.lat==='LOC*'?'LOC *':FL.lat,'g'],FL.latArm?[FL.latArm,'b']:null]}}
  if(npaAppr()){const M={'LOC *':'APP NAV','LOC':'APP NAV','G/S*':'FINAL','G/S':'FINAL'},ren=c=>c&&c.map(x=>x&&[M[x[0]]||x[0].replace('G/S','FINAL').replace(/^LOC\b/,'APP NAV'),x[1]]);
    f.c2=ren(f.c2);f.c3=ren(f.c3);
    if(f.land==='LAND'||(!f.land&&f.c2[0]&&f.c2[0][0]==='FINAL'&&f.c3[0]&&f.c3[0][0]==='APP NAV')){
      f.land='FINAL APP';f.c2=[];f.c3=[];
    }}
  if(FL.tdReached&&!DESCENDING.includes(FL.ver))f.msg='T/D REACHED';
  /* minimums (FBW A32NX_FMCMainDisplay.shouldTransmitMinimums, FMA.tsx): BARO / RADIO / NO DH entered on PERF APPR show on the FMA in descent,
     approach and go-around, and in cruise within 250 NM of the destination; the landing capability joins them once APPR is armed */
  {const q=S.p2,ph=S.phase,toGo=FL.path?FL.path.sThr-FL.s:1e9,inR=!FL.ground&&(['DES','APPR','GA'].includes(ph)||ph==='CRZ'&&toGo<250);
    const mn=!inR?'':q.baro!=null?'BARO '+q.baro:q.radio!=null?(q.radio==='NO'?'NO DH':'RADIO '+q.radio):'';
    if(FCU.appr&&!['ROLLOUT','STOP','IDLE'].includes(st)){const aps=(FCU.ap1?1:0)+(FCU.ap2?1:0);f.c4=aps?[['CAT 3','w'],[aps===2?'DUAL':'SINGLE','w'],[mn,'b']]:[['CAT 1','w'],null,[mn,'b']]}
    else if(mn&&!['ROLLOUT','STOP','IDLE'].includes(st))f.c4=[null,null,[mn,'b']]}
  if(st!=='STOP'){f.c5=[[FCU.ap1&&FCU.ap2?'AP1+2':FCU.ap1?'AP1':FCU.ap2?'AP2':'','w'],[(EFIS.fd?'1':'-')+' FD 2','w'],FCU.athr?['A/THR',FL.thr==='CL'&&st!=='IDLE'?'w':'b']:null]}
  for(const c of['c1','c2','c3'])if(JSON.stringify((f[c]||[])[0])!==JSON.stringify((FL.fma[c]||[])[0]))FL.fmaT[c]=FL.t;
  if(f.land!==FL.fma.land)FL.fmaT.land=FL.t;
  FL.fma=f}

/* ALT armed in magenta, and the PFD target altitude in magenta, when the next level-off is a constraint */
function cstTarget(){if(!flying()||FL.ground||!FL.cst)return null;if(FL.ver==='ALT CST*')return FL.capAlt;if(FL.ver==='ALT CST')return FL.altHold;
  if(FL.ver==='CLB'&&FL.cst.clb!=null&&FL.cst.clb>=FL.alt-200)return FL.cst.clb;if(FL.ver==='DES'&&FL.cst.des!=null&&FL.cst.des<=FL.alt+200)return FL.cst.des;return null}
const cstArmed=()=>FL.verArm.length===1&&FL.verArm[0]==='ALT'&&['CLB','DES'].includes(FL.ver)&&cstTarget()!=null;

/* ---------- one simulation step ---------- */
function step(dt){if(S.tmpy&&typeof ppHoldSync==='function')ppHoldSync(S.tmpy);const ias0=FL.ias;if(FL.sig!==planSig()&&!FL.ground)flightReplan();const P=FL.path,q=S.perf,p2=S.p2,crz=I().crz*100,sp=cfgSpeeds(),gnd=groundElev(),A=FCU.alt;
  const agl=()=>FL.alt-gnd;
  if(PM_AUTO)autoPM(P.sThr-FL.s,sp);lvStep(dt);
  /* LOC, LAND and ROLL OUT never search back along the path (after a go-around the path starts on the final approach) */
  const pr=['NAV','RWY','RWY TRK'].includes(FL.lat)?project(P,FL.pos,FL.seg-2,FL.seg+6):['LOC*','LOC','LAND','ROLL OUT'].includes(FL.lat)?project(P,FL.pos,FL.seg-1,P.pts.length-1):project(P,FL.pos,1,P.pts.length-1);
  if(pr){FL.s=FL.lat==='NAV'?Math.max(FL.s,pr.s):pr.s;FL.seg=pr.i;FL.xtk=pr.xtk;
    /* HDG/TRK: a leg is sequenced only inside the sequencing area, within 7 NM of it and tracking within 90 deg of it (FBW LnavDriver).
       Outside it, e.g. on a downwind beside the final, nothing is sequenced: the distance runs direct to the TO waypoint, then along the path. */
    if(!['NAV','RWY','RWY TRK','LOC*','LOC','LAND','ROLL OUT'].includes(FL.lat)&&!FL.ground&&FL.stage==='AIR'){const a=P.pts,A=a[pr.i-1],B=a[pr.i];
      const tae=Math.abs(((brg(A.p,B.p)-FL.trkT+540)%360)-180);
      if(Math.abs(pr.xtk)>=7||tae>=90){const ti=a.findIndex(q=>q.ix!=null&&q.ix>FL.fromIx);
        if(ti>0){FL.s=Math.min(pr.s,a[ti].s-gc(FL.pos,a[ti].p));FL.seg=ti}}}}
  /* hold: at the end of each circuit, back to the fix for another one until IMM EXIT */
  if(P.holds)for(const h of P.holds){if(FL.holdExit===h.ix)continue;if(['NAV'].includes(FL.lat)&&FL.s>=h.s1-0.05&&FL.s<h.s1+2){FL.s=h.s0+Math.max(0,FL.s-h.s1);FL.seg=h.i0+1}}
  {const h=(P.holds||[]).find(h=>FL.s>=h.s0-0.05&&FL.s<h.s1-0.05&&FL.lat==='NAV');FL.inHold=h?h.ix:null;if(!h&&FL.holdExit!=null&&!(P.holds||[]).some(x=>x.ix===FL.holdExit))FL.holdExit=null}
  /* the offset ends once its rejoin point is passed */
  if(S.active.ofst&&P.ofstEnd!=null&&FL.s>P.ofstEnd+0.5)delete S.active.ofst;
  const dtg=P.sThr-FL.s;
  const fi=FL.fromIx;
  {const ti=P.pts.findIndex(q=>q.ix!=null&&q.ix>FL.fromIx),tl=ti>0&&S.active.legs[P.pts[ti].ix];   /* a climb leg (1548) is sequenced at its altitude */
    if(tl&&tl.k==='ca'&&tl.ca!=null&&FL.alt>=tl.ca&&!FL.ground){FL.fromIx=P.pts[ti].ix}}
  for(const pt of P.pts)if(pt.ix!=null&&pt.s<=FL.s+0.05&&pt.ix>FL.fromIx)FL.fromIx=pt.ix;
  if(FL.fromIx!==fi&&S.page==='FPLN'&&!S.secMode)S.fpOff=0;   /* waypoint sequenced: the F-PLN starts again at the FROM line */

  if(FL.stage==='ROLL'){FL.ias+=(LV.thr==='TOGA'?4.94:4.37)*dt;if(FL.ias>=q.vr){FL.pitch=Math.min(15,FL.pitch+3*dt);if(FL.ias>=q.vr+4){FL.ground=false;FL.stage='AIR';FL.loT=FL.t}}}
  const ga=S.phase==='GA',thrRed=ga?(p2.gaThr??defGa()):(q.thr??defRed()),acc=ga?(p2.gaAcc??defGa()):(q.acc??defRed());
  if(FL.thr==='GA SOFT'&&FL.eoEng)FL.thr='TO';
  if((FL.thr==='TO'||FL.thr==='GA SOFT')&&!FL.ground&&FL.alt>=thrRed){FL.thr='LVR';FL.lvrT=FL.t}
  if(FL.thr==='LVR'&&LV.thr==='CL')FL.thr='CL';   /* LVR CLB until the pilot sets the thrust levers to CL */

  let vsT=0,spdT=FL.ias,trkT=FL.trkT;
  if(FL.stage==='AIR'){
    /* ---- lateral ---- */
    /* takeoff: RWY on the ground, RWY TRK once airborne (NAV stays armed), NAV from 400 ft AAL */
    if(FL.lat==='RWY'&&agl()>30)FL.lat=FCU.hdgMgd||FL.latArm==='NAV'?'RWY TRK':(FCU.trkFpa?'TRK':'HDG');
    {const tko=FL.lat==='RWY TRK'||FL.lat==='GA TRK';
      if(FL.latArm==='NAV'&&!(FL.lat==='GA TRK'&&agl()<100)&&FL.lat!=='RWY'&&!(FL.lat==='RWY TRK'&&agl()<400)&&(tko?pr&&pr.d<0.6&&navTae(P,pr)<90:navCapture(P))){FL.lat='NAV';FL.latArm=null}}
    const lg=hasLs()?locGeo(FL.pos):null,lsArmed=(FCU.loc||FCU.appr)&&lg;
    if(lsArmed&&!['LOC*','LOC','LAND'].includes(FL.lat)){if(FL.latArm!=='NAV')FL.latArm='LOC';
      const hdif=Math.abs(((lg.crs-FL.trkT+540)%360)-180),v=Math.max(140,FL.tas)/1.94384,R=v*v/(9.81*Math.tan(25*D2R))/1852;
      /* LOC capture as the turn onto the course must begin: the turn radius x (1 - cos intercept angle), from 0.25 NM to 1.5 NM off the course */
      if(lg.along>0.5&&lg.along<30&&Math.abs(lg.xtk)<Math.min(1.5,Math.max(0.25,R*(1-Math.cos(Math.min(100,hdif)*D2R))+0.15))&&hdif<100){FL.lat='LOC*';FL.latArm=null;FL.loc=true}}
    if(!lsArmed&&FL.latArm==='LOC')FL.latArm=null;
    if(FL.lat==='LOC*'&&lg&&Math.abs(lg.xtk)<0.08&&Math.abs(((lg.crs-FL.trkT+540)%360)-180)<4)FL.lat='LOC';
    const vr=DB.apt[orig()].var||3,L=Math.max(0.8,Math.min(4,FL.gs*30/3600));
    if(FL.lat==='RWY'||FL.lat==='RWY TRK'){const o=DB.apt[orig()],r=o.rwy[S.active.rwy];trkT=r.crs+(o.var||0)}
    else if(FL.lat==='NAV'){if(FL.s>=P.len-0.05){FL.lat='HDG';FCU.hdgMgd=false;FCU.hdg=Math.round((FL.hdgT-vr+360)%360)||360}else trkT=brg(FL.pos,posAt(P,Math.min(P.len,FL.s+L)).pos)}
    else if(FL.lat==='TRK')trkT=(FCU.hdg??Math.round(FL.trkT-vr))+vr;
    else if(FL.lat==='HDG')trkT=trkOfHdg((FCU.hdg??Math.round(FL.hdgT-vr))+vr,FL.tas,FL.wind);   /* HDG: the selected heading drifts with the wind */
    else if(FL.lat==='GA TRK')trkT=FL.gaTrk;
    else if(['LOC*','LOC','LAND'].includes(FL.lat)&&lg){const d=destRwy(),Ll=Math.max(0.5,Math.min(2,FL.gs*12/3600)),tgt=dst(d.r.pos,lg.crs+180,Math.max(-2,lg.along-Ll));trkT=brg(FL.pos,tgt)}   /* tighter than NAV: 12 s ahead on the course */
    /* ---- vertical ---- */
    const capBand=Math.max(80,Math.abs(FL.vs)*0.12),CK=cstrNow();FL.cst=CK;
    const gp=!FL.ground&&(['TAKEOFF','CLB','GA'].includes(S.phase)||CLIMBING.includes(FL.ver)||FL.ver==='SRS')?1-0.5*(FL.gearPos??1):1;FL.gp=gp;   /* gear drag follows the gear position: half the climb rate and acceleration with the gear down, full once up and locked, gradual in transit */
    if(FL.ver==='SRS'){const rate=FL.thr==='GA SOFT'?2000:2400;
      spdT=ga?FL.gaSpd:q.v2+10;vsT=(ga?Math.min(rate,FL.vs+600):rate)*gp;
      if(FL.alt>=acc){FL.opSmall=false;if(A>FL.alt+capBand){FL.ver=FL.verArm.includes('OP CLB')?'OP CLB':'CLB';FL.verArm=['ALT']}else{FL.ver='ALT*';FL.verArm=[]}if(!ga)S.phase='CLB'}}
    FL.soe=false;
    if(CLIMBING.includes(FL.ver)){if(FL.opSmall&&FL.ver!=='EXP CLB')vsT=1000;else FL.soe=true;   /* THR CLB, speed on elevator: V/S computed after the speed target */
      const lc=FL.ver==='CLB'&&CK.clb!=null&&CK.clb>=FL.alt-200?CK.clb:null;   /* managed climb: level off at the constraint first */
      if(lc!=null&&lc-FL.alt<capBand){FL.ver='ALT CST*';FL.capAlt=lc;FL.verArm=['CLB']}else if(lc==null&&A-FL.alt<capBand)FL.ver='ALT*'}
    if(DESCENDING.includes(FL.ver)){const fl=FL.ver==='DES'&&CK.des!=null&&CK.des<=FL.alt+200?CK.des:null,pa=Math.max(profileAlt(dtg),A,fl??-1e9);
      const slope=profileAlt(dtg)-profileAlt(Math.max(0,dtg-1));   /* ft per NM: 318 on a 3° segment, 0 where the path is level at a constraint */
      if(FL.ver==='DES')vsT=slope>50&&pa-FL.alt>300?-1000   /* below the path (early descent): 1000 ft/min until the path is met */
        :Math.max(-3500,Math.min(slope>50?-300:0,(pa-FL.alt)*3-Math.max(0,slope)*FL.gs/60));
      else if(FL.opSmall&&FL.ver==='OP DES')vsT=-1000;else FL.soe=true;   /* THR IDLE, speed on elevator */
      if(fl!=null&&FL.alt-fl<capBand){FL.ver='ALT CST*';FL.capAlt=fl;FL.verArm=['DES']}else if(fl==null&&FL.alt-A<capBand)FL.ver='ALT*'}
    if(FL.ver==='V/S'||FL.ver==='FPA'){vsT=FL.ver==='FPA'?Math.tan((FCU.fpa||0)*D2R)*FL.gs*101.27:(FCU.vsVal||0);
      if((vsT>0&&A>FL.alt&&A-FL.alt<capBand)||(vsT<0&&A<FL.alt&&FL.alt-A<capBand))FL.ver='ALT*'}
    if(FL.ver==='ALT*'){if(FL.capAlt==null)FL.capAlt=A;const ca=FL.capAlt;vsT=Math.max(-Math.abs(FL.vs)-200,Math.min(Math.abs(FL.vs)+200,(ca-FL.alt)*5));
      if(Math.abs(ca-FL.alt)<25){FL.alt=ca;FL.altHold=ca;FL.ver='ALT';FL.capAlt=null;FL.verArm=FL.verArm.filter(x=>x==='DES'||x==='G/S')}}else if(FL.ver!=='ALT CST*')FL.capAlt=null;
    /* ALT CST*, ALT CST: level at the constraint; the climb or descent resumes once its waypoint is sequenced */
    if(FL.ver==='ALT CST*'){const ca=FL.capAlt??FL.alt;vsT=Math.max(-Math.abs(FL.vs)-200,Math.min(Math.abs(FL.vs)+200,(ca-FL.alt)*5));
      if(Math.abs(ca-FL.alt)<25){FL.alt=ca;FL.altHold=ca;FL.ver='ALT CST';FL.capAlt=null}}
    if(FL.ver==='ALT CST'){const h=FL.altHold??FL.alt;vsT=(h-FL.alt)*4;
      if(FL.verArm.includes('CLB')){if(CK.clb==null||CK.clb>h+50){if(A>FL.alt+capBand){FL.ver='CLB';FL.verArm=['ALT']}else{FL.ver='ALT';FL.verArm=[]}}}
      else if(CK.des==null||CK.des<h-50){if(A<FL.alt-capBand){FL.ver='DES';FL.verArm=['ALT']}else{FL.ver='ALT';FL.verArm=[]}}}
    /* ALT holds the altitude it captured; a new FCU altitude needs a pull or push */
    if(FL.ver==='ALT'){vsT=((FL.altHold??FL.alt)-FL.alt)*4}
    if(FL.verArm.includes('DES')&&!FL.ver.startsWith('ALT CST')&&profileAlt(dtg)<=FL.alt+30&&A<FL.alt-250){FL.ver='DES';FL.verArm=['ALT']}
    if(S.phase==='CRZ'&&FL.s>=FL.td&&!DESCENDING.includes(FL.ver)&&!FL.verArm.includes('DES')&&!FL.tdReached){FL.tdReached=true;msg2('T/D REACHED',false,()=>!flying()||!FL.tdReached)}
    if(DESCENDING.includes(FL.ver))FL.tdReached=false;
    /* STEP ALTS: at the step waypoint (and after it) the step starts once the FCU altitude is set to the step altitude;
       a step climb in CLB, a step descent as a cruise descent in DES at 1000 ft/min; the new level becomes the CRZ FL */
    if(S.phase==='CRZ'&&FL.ver==='ALT'&&typeof nextStep==='function'){const st=nextStep();if(st&&st.passed&&Math.abs(A-st.alt)<50&&Math.abs(FL.alt-st.alt)>250){
      I().crz=Math.round(st.alt/100);delete S.active.legs[st.ix].step;FL.td=P.sThr-tdDist();FL.tdReached=false;
      if(st.alt>FL.alt){FL.ver='CLB';FL.verArm=['ALT']}else{FL.ver='DES';FL.crzDes=true;FL.verArm=['ALT']}}}
    if(FL.ver!=='DES')FL.crzDes=false;
    if(FL.ver==='DES'&&FL.crzDes)vsT=Math.max(-1000,Math.min(0,(A-FL.alt)*3));
    /* glideslope */
    const gsArmed=FCU.appr&&lg;
    if(gsArmed&&!FL.gsCap&&!FL.verArm.includes('G/S')&&!['G/S*','G/S','LAND','FLARE'].includes(FL.ver))FL.verArm=[...FL.verArm.filter(x=>x!=='DES'),'G/S'];
    if(!gsArmed&&FL.verArm.includes('G/S'))FL.verArm=FL.verArm.filter(x=>x!=='G/S');
    if(gsArmed&&FL.verArm.includes('G/S')&&FL.loc&&lg.along>0.5&&lg.along<12&&gsAlt(lg.along)<=FL.alt+40){FL.ver='G/S*';FL.verArm=[];FL.gsCap=true;FL.gssT=FL.t}
    if(['G/S*','G/S','LAND','FLARE'].includes(FL.ver)){const ga=gsAlt(lg?lg.along:dtg);vsT=Math.max(-1500,(ga-FL.alt)*4-318*FL.gs/60);
      if(FL.ver==='G/S*'&&Math.abs(ga-FL.alt)<30&&FL.t-FL.gssT>8)FL.ver='G/S';
      if(FL.ver==='G/S'&&agl()<400&&FL.lat==='LOC'){FL.ver='LAND';FL.lat='LAND'}
      if(FL.ver==='LAND'&&agl()<40)FL.ver='FLARE';
      if(FL.ver==='FLARE')vsT=-Math.max(240,agl()*12)}   /* flare: about 7 s from 40 ft to touchdown */
    /* ---- speed ---- */
    if(FL.ver!=='SRS'){
      /* selected speed: SPD to MACH in the climb when the selected speed reaches the programmed Mach, MACH to SPD in the descent at the programmed descent speed */
      if(!FCU.spdMgd&&FCU.spd!=null){const mI=iasOf(mgd.crzM()*sos(FL.alt),FL.alt);
        if(!FCU.mach&&FL.vs>300&&FCU.spd>=mI){FCU.mach=true;FCU.spd=Math.round(mgd.crzM()*100)/100}
        else if(FCU.mach&&FL.vs<-300&&iasOf(FCU.spd*sos(FL.alt),FL.alt)>=mgd.des()){FCU.mach=false;FCU.spd=mgd.des()}}
      let mm=false;
      if(!FCU.spdMgd&&FCU.spd!=null)spdT=FCU.mach?iasOf(FCU.spd*sos(FL.alt),FL.alt):FCU.spd;
      else{const lim=spdLim('clb'),dl=spdLim('des'),mmo=iasOf((S.phase==='DES'?mgd.desM():mgd.crzM())*sos(FL.alt),FL.alt);
        /* managed: the target is the programmed speed until it equals the programmed Mach, then the Mach (and the reverse in the descent) */
        if(S.phase==='CLB'||S.phase==='TAKEOFF'){const v=FL.alt<lim.alt?lim.spd:mgd.clb();mm=FL.ver!=='EXP CLB'&&mmo<v;spdT=FL.ver==='EXP CLB'?sp.GD:Math.min(v,mmo)}
        else if(S.phase==='CRZ'){spdT=mmo;mm=true;const rm=typeof rtaMach==='function'?rtaMach(FL.alt):null;if(rm){spdT=iasOf(rm*sos(FL.alt),FL.alt);mm=true}}
        else if(S.phase==='DES'){const em=iasOf(0.80*sos(FL.alt),FL.alt);/* the speed limit is started early enough to be met at the limit altitude, and kept once started (a level-off on the way does not cancel it) */
          if(FL.alt<dl.alt+Math.max(1000,decelLead(FL.ias-dl.spd)*Math.max(0,-FL.vs)*60/Math.max(100,FL.gs)+300))FL.spdLimOn=true;else if(FL.alt>dl.alt+6000)FL.spdLimOn=false;
          const v=FL.ver==='EXP DES'?340:FL.spdLimOn?dl.spd:mgd.des();
          mm=FL.ver==='EXP DES'?em<340:mmo<v;spdT=FL.ver==='EXP DES'?Math.min(340,em):Math.min(v,mmo)}
        else if(S.phase==='GA')spdT=sp.GD;
        else if(S.phase==='APPR')spdT=apprCfgSpd(sp,p2)}   /* the speed of the configuration actually set */
      /* managed speed in a hold: the hold speed, from the deceleration point before its fix */
      /* clean: green dot (hold speed); flaps extended: the speed of the configuration. After the exit the speed of the phase comes back
         (in the approach phase, green dot clean) */
      {const hs=FL.conf==='0'?holdSpd():apprCfgSpd(sp,p2);
        const nh=(P.holds||[]).find(h=>FL.holdExit!==h.ix&&h.s1>FL.s);if(nh&&(FL.inHold===nh.ix||FL.s>=nh.sE-0.05||nh.sE-FL.s<=decelLead(FL.ias-hs)+2)){FL.hsActive=nh.ix;if(FCU.spdMgd||FCU.spd==null){spdT=Math.min(spdT,hs);mm=false}}else FL.hsActive=null}
      /* engine out (FMGC EO condition): managed speed green dot in climb and cruise */
      if(FL.eoEng&&S.eo&&(FCU.spdMgd||FCU.spd==null)&&['CLB','CRZ'].includes(S.phase)){spdT=sp.GD;mm=false}
      FL.spdIsMach=!FCU.spdMgd&&FCU.spd!=null?FCU.mach:mm;if(FCU.spdMgd)FCU.mach=mm;
      /* speed constraint (managed speed only) */
      if((FCU.spdMgd||FCU.spd==null)&&CK.spd!=null&&!['EXP CLB','EXP DES'].includes(FL.ver))spdT=Math.max(sp.VLS,Math.min(spdT,CK.spd));
      if(FL.ver==='FLARE')spdT=Math.min(spdT,FL.ias-dt)}   /* about 1 kt/s lost in the flare */
    /* ---- phases ---- */
    if(S.phase==='CLB'&&FL.ver==='ALT'&&Math.abs(FL.alt-crz)<50)S.phase='CRZ';
    if((S.phase==='CRZ'||S.phase==='CLB')&&FL.s>FL.path.len*0.4&&(vsT<0||FL.vs<-300)&&(DESCENDING.includes(FL.ver)||FL.ver==='V/S'||FL.ver==='FPA')&&FL.alt<crz-200)S.phase='DES';
    if(S.phase==='DES'&&dtg<DECEL_NM&&['NAV','LOC*','LOC'].includes(FL.lat))S.phase='APPR';   /* DECEL: approach phase in NAV or LOC, else ACTIVATE APPR PHASE */
    /* ---- configuration (PM) ---- */
    /* configuration: flaps and landing gear on the pilot's commands (LEVERS panel), no automatic sequence */
    /* any other vertical mode (FPA, V/S, DES, FINAL) near the runway: flare at 40 ft, then touchdown and rollout */
    if(!['FLARE','G/S*','G/S','LAND'].includes(FL.ver)&&FL.vs<0&&agl()<40&&dtg<1.5&&dtg>-1.5&&FL.gear){FL.ver='FLARE';FL.verArm=[]}
    /* the ground: below the runway elevation away from the runway (or gear up there) the flight ends */
    if(FL.alt<gnd-1&&FL.vs<0&&FL.ver!=='FLARE'){const rw=dtg<1.5&&dtg>-1.5&&FL.gearPos>=1;if(rw){FL.ver='FLARE'}else{FL.alt=gnd;FL.vs=0;FL.ias=0;FL.ground=true;FL.stage='STOP';S.phase='GROUND CONTACT';FL.running=false;S.msg='GROUND CONTACT'}}
    if(FL.ver==='FLARE'&&agl()<=1&&FL.vs<=0&&FL.gearPos<1){FL.ground=true;FL.alt=gnd;FL.vs=0;FL.ias=0;FL.stage='STOP';S.phase='GEAR UP LANDING';FL.running=false;S.msg='GEAR NOT DOWN AT TOUCHDOWN'}
    if(FL.ver==='FLARE'&&agl()<=1&&FL.vs<=0&&FL.gearPos>=1){FL.ground=true;FL.stage='ROLLOUT';FL.ver='ROLL OUT';FL.lat='ROLL OUT';FL.alt=gnd;FL.vs=0;FCU.ap1=FCU.ap2=false;FCU.athr=false}}
  if(FL.stage==='ROLLOUT'){const idle=['IDLE','REVIDLE','REVMAX'].includes(LV.thr),ab=idle&&LV.askid&&LV.abrk;
    let dec=!idle?0.6:ab?{LO:2.5,MED:3.7,MAX:4.6}[LV.abrk]:LV.askid?(FL.ias>40?3:2.3):1.9;if(ab&&FL.ias<40)dec=Math.min(dec,2.7);   /* gentler roll-out (v0.15.7) */
    if(LV.thr==='REVMAX'&&FL.ias>70)dec+=1.1;else if(LV.thr==='REVIDLE'&&FL.ias>70)dec+=0.3;LV.decel=!!ab&&FL.ias>2;
    FL.ias=Math.max(0,FL.ias-dec*dt);FL.pitch=Math.max(0,FL.pitch-2*dt);
    const lg=locGeo(FL.pos),d=destRwy();trkT=brg(FL.pos,dst(d.r.pos,lg.crs+180,lg.along-1));if(FL.ias<=0){FL.stage='STOP';S.phase='DONE';FL.running=false}}
  if(FL.stage==='ROLL'){const o=DB.apt[orig()],r=o.rwy[S.active.rwy];trkT=r.crs+(o.var||0)}

  if(FL.stage==='AIR')spdT=Math.min(spdT,VFE[FL.conf]-4,FL.gear?VLE-4:999);   /* flaps or gear not retracted: the speed is held below VFE / VLE */
  /* speed on elevator (OP CLB, CLB, EXP CLB with CLB thrust; OP DES, EXP DES with idle): the vertical speed is what the thrust leaves
     once the acceleration toward the target speed is paid for (climb or descent capability minus the energy used to accelerate) */
  if(FL.stage==='AIR'&&FL.soe){const gw=gwNowF(),cfgD=({'0':0,'1':1,'1+F':1.3,'2':2,'3':3,'FULL':4}[FL.conf]||0)*220+(FL.gear?500:0),climb=CLIMBING.includes(FL.ver),k=Math.max(150,FL.tas)*5.3;
    const cap=climb?Math.max(400,(3300-FL.alt*0.06)*(64/gw))*(FL.eoEng?0.42:1)-cfgD:-(600+Math.max(0,FL.ias-200)*12+FL.alt*0.035)-cfgD;
    const g2=FL.gp||1,cap2=climb?cap*g2:cap;let a=Math.max(-1,Math.min(1,(spdT-FL.ias)*0.12))*(climb?g2:1),v=cap2-k*a;
    if(climb&&v<0){v=0;a=cap2/k}
    /* idle descent: the rate of descent that gives the deceleration (or acceleration) wanted; the speed then follows the rate actually flown */
    /* speed target above the speed (speed selected up, EXP DES): the nose goes down, the rate of descent increases and the speed increases in
       proportion to it; OP DES up to 10 kt per NM (4000 ft/min clean), EXP DES up to 15 kt per NM (5000 ft/min clean) */
    if(!climb){v=-idleVs(Math.max(FL.ver==='EXP DES'?-15:-10,FL.ias-spdT),FL.gs);a=-idleDecel(FL.vs,FL.gs)*FL.gs/3600}
    FL.accT=a;vsT=v}
  expedSync();FL.spdT=spdT;vsT=Math.max(-6000,Math.min(6000,vsT));
  /* ---- dynamics ---- */
  if(FL.stage==='AIR'){const g3=FL.gp||1;/* thrust at idle sets how fast the speed can come back: never faster than the idle deceleration of the configuration and rate of descent */
    const idle=FL.ver==='FLARE'||FL.ver==='SRS'?-9:-idleDecel(FL.vs,FL.gs)*FL.gs/3600;
    FL.ias+=FL.soe?FL.accT*dt:Math.max(idle*dt,Math.max(-1.6*dt,Math.min(1.6*g3*dt,spdT-FL.ias)));
    /* lift-off: the rate of climb builds up along an S curve (slow, faster, slow) and reaches its target 5 s after lift-off */
    const lo=FL.ver==='SRS'&&S.phase!=='GA'&&FL.loT!=null?(FL.t-FL.loT)/5:1;
    if(lo<1){const x=Math.max(0,lo);FL.vs=vsT*x*x*(3-2*x)}else FL.vs+=Math.max(-600*dt,Math.min(600*dt,vsT-FL.vs));
    FL.alt+=FL.vs/60*dt}
  else if(FL.ground)FL.alt=gnd;
  FL.tas=tasOf(FL.ias,FL.alt);FL.gs=FL.ground?FL.ias:FL.tas;FL.mach=FL.tas/sos(FL.alt);
  const dh=((trkT-FL.trkT+540)%360)-180,rate=Math.max(-3,Math.min(3,dh*0.6));FL.trkT=(FL.trkT+rate*dt+360)%360;
  /* wind of the OFP: the guidance flies ground tracks, so the heading carries the drift and the ground speed the head or tail wind */
  FL.wind=FL.ground?{dir:0,spd:0}:windAt(FL.pos,FL.alt,FL.alt-groundElev());{const c=crabOf(FL.trkT,FL.tas,FL.wind);FL.hdgT=c.hdg;if(!FL.ground)FL.gs=c.gs}
  const bank=FL.ground?0:Math.max(-30,Math.min(30,Math.atan(rate*D2R*FL.tas*0.5144/9.81)/D2R));FL.roll+=Math.max(-5*dt,Math.min(5*dt,bank-FL.roll));
  FL.pos=dst(FL.pos,FL.trkT,FL.gs*KT2NMS*dt);
  if(FL.stage==='AIR'){const fpa=Math.atan2(FL.vs,Math.max(60,FL.gs)*101.27)/D2R,aoa=FL.conf==='0'?2.5:FL.conf==='FULL'?4:3.5;
    {const pr=FL.ver==='SRS'&&S.phase!=='GA'?3:2;   /* rotation: 3 degrees per second, 0 to 15 degrees in 5 s */
    FL.pitch+=Math.max(-2*dt,Math.min(pr*dt,(FL.ver==='SRS'?15:fpa+aoa)-FL.pitch))}}
  const ff=FL.stage==='ROLL'||FL.thr==='TO'?5.6:CLIMBING.includes(FL.ver)||FL.ver==='SRS'?3.2:DESCENDING.includes(FL.ver)?0.7:FL.ground?0.4:FL.alt>20000?PM.ff(I().crz,I().ci)*PM.wf(gwNowF()):2.4;
  FL.fob=Math.max(0,FL.fob-ff*dt/3600);FL.t+=dt;
  /* speed trend (kt/s), smoothed, for the PFD trend arrow */
  const aNow=(FL.ias-ias0)/(dt||1);FL.acc=(FL.acc??0)+(aNow-(FL.acc??0))*Math.min(1,dt*1.2)}

/* ---------- loop ---------- */
function flightTick(dtReal){
  if(!FL.active)return;
  let dt=dtReal*FL.rate;
  let before=dt>0?cockpitAudio.readFlight():null;
  while(dt>0){
    const h=Math.min(0.5,dt);
    step(h);
    const after=cockpitAudio.readFlight();
    cockpitAudio.sample(before,after);
    before=after;
    dt-=h;
    if(!FL.running)break;
  }
  cockpitAudio.flush();
  setFma();refreshAll()
}
function refreshAll(){if(typeof render==='function')render();if(window.drawPFD2D)drawPFD2D();if(window.drawFcu)drawFcu();if(window.drawEcam)drawEcam();flightUI()}
let _lastFrame=null,_acc=0;
/* the flight advances on the animation frames of the page and of every pop-out window (flightPump), so it keeps running when the page
   itself is covered or minimised and only a pop-out window is in view; the time comes from one clock, so several callers do not add up */
function flightPump(){const ts=performance.now();if(FL.active&&FL.running){if(_lastFrame!=null){const d=Math.min(0.25,(ts-_lastFrame)/1000);_acc+=d;if(_acc>=0.1){flightTick(_acc);_acc=0}}}_lastFrame=ts}
function frame(){flightPump();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
function flightSkip(cond){if(!FL.active)return;cockpitAudio.cancelFlight();let n=0;while(!cond()&&FL.stage!=='STOP'&&n<40000){step(0.5);if(n%20===0)setFma();n++}setFma();refreshAll()}

/* ---------- UTC in flight ---------- */
function utcStr(ms){const d=new Date(ms);return String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0')}

/* ---------- control bar ---------- */
function flightUI(){const host=$('#flight');if(!host)return;const miss=FL.active?[]:flightReady();
  const st=$('#flState'),rd=$('#flReady');
  if(st)st.innerHTML=FL.active&&FL.stage==='LINEUP'?`<b>LINED UP</b><span>LEVERS: thrust levers 50% N1, then FLX/MCT or TOGA</span>`:FL.active?`<b>${S.phase}</b><span>${Math.max(0,FL.path.sThr-FL.s).toFixed(0)} NM to go</span><span>${Math.floor(FL.t/60)} min</span><span>${FL.conf==='0'?'CLEAN':'CONF '+FL.conf}${FL.gear?' · GEAR DOWN':''}</span>`:`<b>READY?</b><span>${miss.length?'Complete first:':'All set. Press START.'}</span>`;
  if(rd){rd.innerHTML=miss.map(m=>`<li>${m}</li>`).join('');rd.hidden=!miss.length||FL.active}
  const b=k=>host.querySelector(`[data-fl="${k}"]`);
  b('start').hidden=FL.active;b('start').disabled=!!miss.length;b('pause').hidden=!FL.active||FL.stage==='STOP';b('pause').textContent=FL.running?'PAUSE':'RESUME';
  b('reset').hidden=!FL.active;host.querySelectorAll('[data-fl^="rate"]').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.fl.slice(5)===FL.rate)));
  ['td','appr'].forEach(k=>b(k).disabled=!FL.active||FL.stage==='STOP');
  {const x=b('ga');if(x)x.disabled=!FL.active||FL.ground||!['APPR','DES'].includes(S.phase)}
  ['eng:1','eng:2'].forEach(k=>{const x=b(k);if(x){x.disabled=!FL.active||FL.ground;x.setAttribute('aria-pressed',String(FL.eoEng===+k.slice(4)))}})}
function flightBtn(k){
  if(k==='start'){const m=flightStart();if(m.length)S.msg='F-PLN/PERF INCOMPLETE'}
  else if(k==='pause'){FL.running=!FL.running;if(!FL.running)cockpitAudio.cancelFlight()}
  else if(k==='reset')flightReset();
  else if(k.startsWith('rate'))FL.rate=+k.slice(5);
  else if(k==='ga')lever('thr','TOGA');
  else if(k.startsWith('pm:'))PM_AUTO=k==='pm:on';
  else if(k.startsWith('eng:')&&FL.active&&!FL.ground){
    const n=+k.slice(4);
    FL.eoEng=FL.eoEng===n?null:n;
    S.eo=!!FL.eoEng;
    if(S.eo)cockpitAudio.play('warning');
  }
  else if(k==='td')flightSkip(()=>FL.s>=FL.td-5||FL.tdReached);
  else if(k==='appr')flightSkip(()=>FL.path.sThr-FL.s<=30);
  refreshAll()}
{const host=$('#flight');if(host)host.querySelectorAll('[data-fl]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.fl;
  if(k==='reset'&&typeof askConfirm==='function')askConfirm('Reset the flight?','The flight in progress will be stopped. The MCDU set-up is kept.','RESET FLIGHT',()=>flightBtn(k));
  else if(k==='setup:load'&&FL.active&&typeof askConfirm==='function')askConfirm('Load the saved set-up?','The flight in progress will be stopped and replaced by the saved set-up.','LOAD SET-UP',()=>flightBtn(k));
  else flightBtn(k)}))}
window.__FL=FL;window.__flight=flightBtn;window.__flSkip=flightSkip;
