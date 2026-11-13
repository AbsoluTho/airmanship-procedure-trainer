'use strict';
/* ================= automatic flight, guided by the FCU and the FMGS =================
   A procedure trainer, not a flight model. The aircraft is steered by the engaged
   lateral and vertical modes (NAV, HDG/TRK, LOC, RWY; SRS, CLB, OP CLB, DES, OP DES,
   V/S, FPA, ALT, G/S...) and holds the managed or selected speed. Without an AP the
   pilot is assumed to follow the FD. Mode names follow the FlyByWire A32NX FMA.
   Figures are approximations for training the procedures only. */
const FL={active:false,running:false,rate:4,t:0,utc0:0,path:null,s:0,seg:1,xtk:0,pos:null,hdgT:0,trkT:0,roll:0,pitch:0,alt:0,vs:0,ias:0,tas:0,gs:0,mach:0,ground:true,
  lat:'RWY',latArm:null,ver:'SRS',verArm:[],thr:'TO',conf:'1+F',gear:true,fob:0,fromIx:0,td:null,tdReached:false,loc:false,gsCap:false,
  fma:{c1:[],c2:[],c3:[],c4:[],c5:[]},fmaT:{},stage:'IDLE'};
const KT2NMS=1/3600;

/* ---------- lateral path from the F-PLN ---------- */
function buildPath(){const p=S.active,pts=[];let vr=DB.apt[p.legs[0].id].var||0;
  const push=(pos,ix)=>{const last=pts[pts.length-1];if(last&&gc(last.p,pos)<0.01){if(ix!=null)last.ix=ix;return}pts.push({p:pos,ix})};
  let tp=-1;p.legs.forEach((l,i)=>{if(l.k==='tp')tp=i});   /* after a DIR TO the path starts at the turn point */
  for(let ix=Math.max(0,tp);ix<p.legs.length;ix++){const l=p.legs[ix];
    if(l.k==='tp'){push(l.pos,ix);continue}
    if(l.seg==='map')break;
    if(l.k==='orig'){const ap=DB.apt[l.id],r=ap.rwy[l.rwy];vr=ap.var||0;push(r.pos,ix);push(dst(r.pos,r.crs+vr,Math.min(1.6,r.len/1852*0.7)),null);continue}
    if(l.k==='ca'){const o=p.legs[0],ap=DB.apt[o.id],r=ap.rwy[o.rwy];push(dst(r.pos,r.crs+vr,r.len/1852+l.aal/320),ix);continue}
    if(l.k==='wpt'){const pos=DB.wpt[l.id];if(!pos)continue;const prev=pts[pts.length-1];
      if(l.lbl==='ARC'&&l.ctr&&DB.wpt[l.ctr]&&prev)arcPts(prev.p,pos,DB.wpt[l.ctr]).slice(1,-1).forEach(q=>push(q,null));
      push(pos,ix);continue}
    if(l.k==='dest'){const ap=DB.apt[l.id],r=ap.rwy[l.rwy];push(r.pos,ix);push(dst(r.pos,r.crs+(ap.var||0),r.len/1852*0.75),null);break}}
  let s=0;pts.forEach((q,i)=>{if(i)s+=gc(pts[i-1].p,q.p);q.s=s});
  const thr=pts.find(q=>q.ix!=null&&p.legs[q.ix].k==='dest')||pts[pts.length-1];
  return{pts,len:s,sThr:thr.s}}
const planSig=()=>{const p=S.active;return p?p.legs.map(l=>l.k+(l.id||'')+(l.rwy||'')).join('|')+(p.appr||''):''};
/* the active F-PLN changed in flight (DIR TO, ENABLE ALTN, new approach...): rebuild the path from the present position */
function flightReplan(){const P=buildPath();FL.path=P;const pr=project(P,FL.pos,1,P.pts.length-1);FL.s=pr?pr.s:0;FL.seg=pr?pr.i:1;FL.fromIx=0;
  for(const pt of P.pts)if(pt.ix!=null&&pt.s<=FL.s+0.05&&pt.ix>FL.fromIx)FL.fromIx=pt.ix;FL.td=P.sThr-tdDist();FL.sig=planSig();FL.tdReached=false}
function posAt(P,s){const a=P.pts;let i=1;while(i<a.length-1&&a[i].s<s)i++;const A=a[i-1],B=a[i],f=Math.max(0,Math.min(1,(s-A.s)/((B.s-A.s)||1)));
  return{pos:[A.p[0]+(B.p[0]-A.p[0])*f,A.p[1]+(B.p[1]-A.p[1])*f],trk:brg(A.p,B.p),i}}
/* local flat projection around a point (NM) */
function enu(o,p){return[(p[1]-o[1])*60*Math.cos(o[0]*D2R),(p[0]-o[0])*60]}
/* closest point on the path: along-track distance and cross-track (+ right of track) */
function project(P,pos,from,to){let best=null;const a=P.pts;
  for(let i=Math.max(1,from);i<=Math.min(a.length-1,to);i++){const A=a[i-1],B=a[i],b=enu(A.p,B.p),q=enu(A.p,pos),L2=b[0]*b[0]+b[1]*b[1]||1e-9;
    let f=(q[0]*b[0]+q[1]*b[1])/L2;f=Math.max(0,Math.min(1,f));const dx=q[0]-b[0]*f,dy=q[1]-b[1]*f,d=Math.hypot(dx,dy);
    if(!best||d<best.d){const L=Math.sqrt(L2);best={d,s:A.s+f*L,i,xtk:(b[0]*q[1]-b[1]*q[0])/L*-1}}}
  return best}

/* ---------- final approach course (LOC) ---------- */
function destRwy(){const p=S.active,d=p.legs[idxK(p,'dest')],a=DB.apt[d.id];return{a,r:a.rwy[d.rwy],tdze:a.rwy[d.rwy].tdze??a.elev}}
function locGeo(pos){const d=destRwy(),c=d.r.crs+(d.a.var||0),q=enu(d.r.pos,pos),u=[Math.sin(c*D2R),Math.cos(c*D2R)];
  const along=-(q[0]*u[0]+q[1]*u[1]),xtk=(u[0]*q[1]-u[1]*q[0])*-1;return{crs:c,along,xtk}}   /* along: NM before the threshold */
function faf(){const p=S.active,di=idxK(p,'dest');for(let i=di-1;i>0;i--){const l=p.legs[i];if(l.k==='wpt'&&l.alt&&l.seg==='arr')return l.alt.v}return destRwy().tdze+1500}
function gsAlt(dtg){return destRwy().tdze+50+318*Math.max(0,dtg)}
function profileAlt(dtg){const tdze=destRwy().tdze,Ai=faf(),dgs=(Ai-tdze-50)/318;
  if(dtg<=dgs)return gsAlt(dtg);if(dtg<=dgs+8)return Ai;return Ai+318*(dtg-dgs-8)}
function tdDist(){const crz=I().crz*100,tdze=destRwy().tdze,Ai=faf(),dgs=(Ai-tdze-50)/318;return dgs+8+(crz-Ai)/318}
const hasLs=()=>{const p=S.active;return!!(p&&p.appr&&/^(ILS|LOC)/.test(p.appr))};

/* ---------- atmosphere and speeds ---------- */
const tasOf=(ias,alt)=>ias*(1+alt/1000*0.02);
const iasOf=(tas,alt)=>tas/(1+alt/1000*0.02);
const sos=alt=>661.47*Math.sqrt(Math.max(216.65,288.15-1.98*alt/1000)/288.15);
function gwNowF(){return S.fuel.zfw+FL.fob}
function cfgSpeeds(){const w=gwNowF(),cs=charSpeeds(w);return{GD:cs.O,S:cs.S,F:cs.F,VLS:vls(w,S.p2.conf3)}}
function groundElev(){if(!FL.path)return elevO();const o=DB.apt[orig()];return FL.s<FL.path.sThr/2?(o.rwy[S.active.rwy].tdze??o.elev):destRwy().tdze}

/* ---------- readiness ---------- */
function flightReady(){const a=S.active,i=I(),q=S.perf,f=S.fuel,miss=[];
  if(!a||!a.rwy)miss.push('F-PLN: departure runway');if(!a||!a.appr)miss.push('F-PLN: approach');
  if(a&&a.legs.slice(0,idxK(a,'dest')).some(l=>l.k==='disc'))miss.push('F-PLN: discontinuity');
  if(!i.crz)miss.push('INIT A: CRZ FL');if(f.zfw==null||f.block==null)miss.push('INIT FUEL PRED: ZFW and BLOCK');
  if(!q.v1||!q.vr||!q.v2)miss.push('PERF TAKE OFF: V1, VR, V2');if(!q.flaps)miss.push('PERF TAKE OFF: FLAPS/THS');
  if(FCU.alt<=elevO()+400)miss.push('FCU: altitude above the airfield (initial clearance)');
  return miss}

/* ---------- start, reset ---------- */
function flightStart(){const miss=flightReady();if(miss.length)return miss;
  const P=buildPath(),o=DB.apt[orig()],r=o.rwy[S.active.rwy],tr=r.crs+(o.var||0);
  Object.assign(FL,{active:true,running:true,t:0,utc0:Date.now(),path:P,s:0,seg:1,xtk:0,pos:r.pos,hdgT:tr,trkT:tr,roll:0,pitch:0,alt:r.tdze??o.elev,vs:0,ias:0,tas:0,gs:0,mach:0,
    ground:true,lat:'RWY',latArm:FCU.hdgMgd?'NAV':null,ver:'SRS',verArm:[FCU.lvlch?'CLB':'OP CLB'],thr:'TO',conf:q2conf(),gear:true,
    fob:S.fuel.block-(S.fuel.taxi??0.2),fromIx:0,fmaT:{},loc:false,gsCap:false,tdReached:false,stage:'ROLL',lvrT:null});
  FCU.athr=true;FL.td=P.sThr-tdDist();FL.sig=planSig();S.phase='TAKEOFF';if(S.msg==='GPS PRIMARY')S.msg=null;setFma();flightTick(0);return[]}
function q2conf(){const f=S.perf.flaps;return f===1?'1+F':String(f||1)}
function flightReset(){Object.assign(FL,{active:false,running:false,path:null,stage:'IDLE',fma:{c1:[],c2:[],c3:[],c4:[],c5:[]},ias:0,gs:0,tas:0,vs:0});
  FCU.ap1=FCU.ap2=FCU.athr=FCU.loc=FCU.appr=FCU.exped=false;S.phase='PREFLIGHT';S.apprArm=false;refreshAll()}

/* ---------- FCU actions arriving in flight ---------- */
const CLIMBING=['CLB','OP CLB','EXP CLB'],DESCENDING=['DES','OP DES','EXP DES'];
function fcuEvent(ev){if(!FL.active)return;const A=FCU.alt;
  if(ev==='alt-pull'){if(FL.ground)return;if(Math.abs(A-FL.alt)<250)return;FL.ver=A>FL.alt?(FCU.exped?'EXP CLB':'OP CLB'):(FCU.exped?'EXP DES':'OP DES');FL.verArm=['ALT']}
  if(ev==='alt-push'){if(FL.ground){FL.verArm=['CLB'];return}if(Math.abs(A-FL.alt)<250)return;
    if(A>FL.alt){FL.ver='CLB';FL.verArm=['ALT']}else if(FL.s>=FL.td-1||S.phase==='DES'||S.phase==='APPR'){FL.ver='DES';FL.verArm=['ALT']}else{FL.verArm=['DES']}}
  if(ev==='vs-pull'){if(FL.ground)return;FL.ver=FCU.trkFpa?'FPA':'V/S';FL.verArm=['ALT']}
  if(ev==='vs-push'){if(FL.ground)return;FL.ver=FCU.trkFpa?'FPA':'V/S';FCU.vsVal=0;FCU.fpa=0;FL.verArm=[]}
  if(ev==='hdg-pull'){if(FL.ground){FL.latArm=null;return}FL.lat=FCU.trkFpa?'TRK':'HDG';FL.latArm=null}
  if(ev==='hdg-push'){if(FL.ground){FL.latArm='NAV';return}const pr=project(FL.path,FL.pos,1,FL.path.pts.length-1);
    if(pr&&Math.abs(pr.xtk)<0.3){FL.lat='NAV';FL.latArm=null;FL.seg=pr.i;FL.s=pr.s}else FL.latArm='NAV'}
  if(ev==='exped'){if(CLIMBING.includes(FL.ver))FL.ver=FCU.exped?'EXP CLB':'OP CLB';if(DESCENDING.includes(FL.ver))FL.ver=FCU.exped?'EXP DES':'OP DES'}
  setFma();refreshAll()}

/* ---------- FMA (mode strings from the FlyByWire A32NX FMA) ---------- */
function setFma(){const st=FL.stage,a=S.perf,fx=a.flex!=null?'FLX '+a.flex:'TOGA',f={c1:[],c2:[],c3:[],c4:[],c5:[]};
  const guide=EFIS.fd||FCU.ap1||FCU.ap2;
  if(FL.thr==='TO'&&st!=='IDLE'){f.c1=[['MAN','w'],[fx,'w']]}
  else if(FL.thr==='LVR'){f.c1=[['LVR CLB','w',true]]}
  else if(FCU.athr&&!['ROLLOUT','STOP','IDLE'].includes(st)){
    if(FL.ver==='FLARE'&&FL.alt-groundElev()<25)f.c1=[['RETARD','w']];
    else if(CLIMBING.includes(FL.ver)||FL.ver==='SRS')f.c1=[['THR CLB','g']];
    else if(DESCENDING.includes(FL.ver))f.c1=[['THR IDLE','g']];
    else f.c1=[[(FCU.mach||(FCU.spdMgd&&FL.mach>0.72&&FL.alt>25000))?'MACH':'SPEED','g']]}
  if(guide&&st!=='IDLE'){
    if(['LAND','FLARE','ROLL OUT'].includes(FL.ver))f.land=FL.ver;
    else{const crzAlt=FCU.alt===I().crz*100&&FL.alt>20000;
      f.c2=[[FL.ver==='ALT'&&crzAlt?'ALT CRZ':FL.ver==='ALT*'&&crzAlt?'ALT CRZ*':FL.ver,'g'],FL.verArm.length?[FL.verArm.join(' '),'b']:null];
      f.c3=[[FL.lat==='LOC*'?'LOC *':FL.lat,'g'],FL.latArm?[FL.latArm,'b']:null]}}
  if(FL.tdReached&&!DESCENDING.includes(FL.ver))f.msg='T/D REACHED';
  if((FCU.appr||FCU.loc)&&!['ROLLOUT','STOP','IDLE'].includes(st)&&FCU.appr){const q=S.p2,aps=(FCU.ap1?1:0)+(FCU.ap2?1:0),mn=q.radio!=null?(q.radio==='NO'?'NO DH':'DH '+q.radio):q.baro!=null?'BARO '+q.baro:'';
    f.c4=aps?[['CAT 3','w'],[aps===2?'DUAL':'SINGLE','w'],[mn,'b']]:[['CAT 1','w'],null,[mn,'b']]}
  if(st!=='STOP'){f.c5=[[FCU.ap1&&FCU.ap2?'AP1+2':FCU.ap1?'AP1':FCU.ap2?'AP2':'','w'],[(EFIS.fd?'1':'-')+' FD 2','w'],FCU.athr?['A/THR',FL.thr==='CL'&&st!=='IDLE'?'w':'b']:null]}
  for(const c of['c1','c2','c3'])if(JSON.stringify((f[c]||[])[0])!==JSON.stringify((FL.fma[c]||[])[0]))FL.fmaT[c]=FL.t;
  if(f.land!==FL.fma.land)FL.fmaT.land=FL.t;
  FL.fma=f}

/* ---------- one simulation step ---------- */
function step(dt){if(FL.sig!==planSig()&&!FL.ground)flightReplan();const P=FL.path,q=S.perf,p2=S.p2,crz=I().crz*100,sp=cfgSpeeds(),gnd=groundElev(),A=FCU.alt;
  const agl=()=>FL.alt-gnd;
  const pr=['NAV','RWY','RWY TRK'].includes(FL.lat)?project(P,FL.pos,FL.seg-2,FL.seg+6):project(P,FL.pos,1,P.pts.length-1);
  if(pr){FL.s=FL.lat==='NAV'?Math.max(FL.s,pr.s):pr.s;FL.seg=pr.i;FL.xtk=pr.xtk}
  const dtg=P.sThr-FL.s;
  const fi=FL.fromIx;for(const pt of P.pts)if(pt.ix!=null&&pt.s<=FL.s+0.05&&pt.ix>FL.fromIx)FL.fromIx=pt.ix;
  if(FL.fromIx!==fi&&S.page==='FPLN'&&!S.secMode)S.fpOff=0;   /* waypoint sequenced: the F-PLN starts again at the FROM line */

  if(FL.stage==='ROLL'){FL.ias+=3.4*dt;if(FL.ias>=q.vr){FL.pitch=Math.min(15,FL.pitch+3*dt);if(FL.ias>=q.vr+4){FL.ground=false;FL.stage='AIR'}}}
  const thrRed=q.thr??defRed(),acc=q.acc??defRed();
  if(FL.thr==='TO'&&!FL.ground&&FL.alt>=thrRed){FL.thr='LVR';FL.lvrT=FL.t}
  if(FL.thr==='LVR'&&FL.t-FL.lvrT>4)FL.thr='CL';

  let vsT=0,spdT=FL.ias,trkT=FL.trkT;
  if(FL.stage==='AIR'){
    /* ---- lateral ---- */
    if(FL.lat==='RWY'&&agl()>30){if(FL.latArm==='NAV'){FL.lat='NAV';FL.latArm=null}else FL.lat=FCU.hdgMgd?'RWY TRK':(FCU.trkFpa?'TRK':'HDG')}
    if(FL.latArm==='NAV'&&pr&&Math.abs(pr.xtk)<0.6){FL.lat='NAV';FL.latArm=null}
    const lg=hasLs()?locGeo(FL.pos):null,lsArmed=(FCU.loc||FCU.appr)&&lg;
    if(lsArmed&&!['LOC*','LOC','LAND'].includes(FL.lat)){if(FL.latArm!=='NAV')FL.latArm='LOC';
      const hdif=Math.abs(((lg.crs-FL.trkT+540)%360)-180);if(lg.along>0.5&&lg.along<30&&Math.abs(lg.xtk)<1.2&&hdif<100){FL.lat='LOC*';FL.latArm=null;FL.loc=true}}
    if(!lsArmed&&FL.latArm==='LOC')FL.latArm=null;
    if(FL.lat==='LOC*'&&lg&&Math.abs(lg.xtk)<0.08&&Math.abs(((lg.crs-FL.trkT+540)%360)-180)<4)FL.lat='LOC';
    const vr=DB.apt[orig()].var||3,L=Math.max(0.8,Math.min(4,FL.gs*30/3600));
    if(FL.lat==='RWY'||FL.lat==='RWY TRK'){const o=DB.apt[orig()],r=o.rwy[S.active.rwy];trkT=r.crs+(o.var||0)}
    else if(FL.lat==='NAV'){if(FL.s>=P.len-0.05){FL.lat='HDG';FCU.hdgMgd=false;FCU.hdg=Math.round((FL.trkT-vr+360)%360)||360}else trkT=brg(FL.pos,posAt(P,Math.min(P.len,FL.s+L)).pos)}
    else if(FL.lat==='HDG'||FL.lat==='TRK')trkT=(FCU.hdg??Math.round(FL.trkT-vr))+vr;
    else if(['LOC*','LOC','LAND'].includes(FL.lat)&&lg){const d=destRwy(),tgt=dst(d.r.pos,lg.crs+180,Math.max(-2,lg.along-L));trkT=brg(FL.pos,tgt)}
    /* ---- vertical ---- */
    const capBand=Math.max(80,Math.abs(FL.vs)*0.12);
    if(FL.ver==='SRS'){spdT=q.v2+10;vsT=2400;
      if(FL.alt>=acc){if(A>FL.alt+capBand){FL.ver=FL.verArm.includes('OP CLB')?'OP CLB':'CLB';FL.verArm=['ALT']}else{FL.ver='ALT*';FL.verArm=[]}S.phase='CLB'}}
    if(CLIMBING.includes(FL.ver)){vsT=FL.ver==='EXP CLB'?3500:FL.alt<10000?2800:FL.alt<25000?2000:1300;if(A-FL.alt<capBand)FL.ver='ALT*'}
    if(DESCENDING.includes(FL.ver)){const pa=Math.max(profileAlt(dtg),A);
      vsT=FL.ver==='DES'?Math.max(-3500,Math.min(-300,(pa-FL.alt)*3-318*FL.gs/60)):FL.ver==='EXP DES'?-3500:-2200;
      if(FL.alt-A<capBand)FL.ver='ALT*'}
    if(FL.ver==='V/S'||FL.ver==='FPA'){vsT=FL.ver==='FPA'?Math.tan((FCU.fpa||0)*D2R)*FL.gs*101.27:(FCU.vsVal||0);
      if((vsT>0&&A>FL.alt&&A-FL.alt<capBand)||(vsT<0&&A<FL.alt&&FL.alt-A<capBand))FL.ver='ALT*'}
    if(FL.ver==='ALT*'){if(FL.capAlt==null)FL.capAlt=A;const ca=FL.capAlt;vsT=Math.max(-Math.abs(FL.vs)-200,Math.min(Math.abs(FL.vs)+200,(ca-FL.alt)*5));
      if(Math.abs(ca-FL.alt)<25){FL.alt=ca;FL.altHold=ca;FL.ver='ALT';FL.capAlt=null;FL.verArm=FL.verArm.filter(x=>x==='DES'||x==='G/S')}}else FL.capAlt=null;
    /* ALT holds the altitude it captured; a new FCU altitude needs a pull or push */
    if(FL.ver==='ALT'){vsT=((FL.altHold??FL.alt)-FL.alt)*4}
    if(FL.verArm.includes('DES')&&FL.s>=FL.td&&A<FL.alt-250){FL.ver='DES';FL.verArm=['ALT']}
    if(S.phase==='CRZ'&&FL.s>=FL.td&&!DESCENDING.includes(FL.ver)&&!FL.verArm.includes('DES')&&!FL.tdReached){FL.tdReached=true;S.msg='T/D REACHED'}
    if(DESCENDING.includes(FL.ver))FL.tdReached=false;
    /* glideslope */
    const gsArmed=FCU.appr&&lg;
    if(gsArmed&&!FL.gsCap&&!FL.verArm.includes('G/S')&&!['G/S*','G/S','LAND','FLARE'].includes(FL.ver))FL.verArm=[...FL.verArm.filter(x=>x!=='DES'),'G/S'];
    if(!gsArmed&&FL.verArm.includes('G/S'))FL.verArm=FL.verArm.filter(x=>x!=='G/S');
    if(gsArmed&&FL.verArm.includes('G/S')&&FL.loc&&lg.along>0.5&&lg.along<12&&gsAlt(lg.along)<=FL.alt+40){FL.ver='G/S*';FL.verArm=[];FL.gsCap=true;FL.gssT=FL.t}
    if(['G/S*','G/S','LAND','FLARE'].includes(FL.ver)){const ga=gsAlt(lg?lg.along:dtg);vsT=Math.max(-1500,(ga-FL.alt)*4-318*FL.gs/60);
      if(FL.ver==='G/S*'&&Math.abs(ga-FL.alt)<30&&FL.t-FL.gssT>8)FL.ver='G/S';
      if(FL.ver==='G/S'&&agl()<400&&FL.lat==='LOC'){FL.ver='LAND';FL.lat='LAND'}
      if(FL.ver==='LAND'&&agl()<40)FL.ver='FLARE';
      if(FL.ver==='FLARE')vsT=-Math.max(120,agl()*6)}
    /* ---- speed ---- */
    if(FL.ver!=='SRS'){
      if(!FCU.spdMgd&&FCU.spd!=null)spdT=FCU.mach?iasOf(FCU.spd*sos(FL.alt),FL.alt):FCU.spd;
      else{const lim=spdLim('clb'),dl=spdLim('des'),mmo=iasOf(mgd.crzM()*sos(FL.alt),FL.alt);
        if(S.phase==='CLB'||S.phase==='TAKEOFF')spdT=FL.ver==='EXP CLB'?sp.GD:Math.min(FL.alt<lim.alt?lim.spd:mgd.clb(),mmo);
        else if(S.phase==='CRZ')spdT=mmo;
        else if(S.phase==='DES')spdT=FL.ver==='EXP DES'?Math.min(340,mmo):Math.min(FL.alt<dl.alt+1000?dl.spd:mgd.des(),mmo);
        else if(S.phase==='APPR'){const vapp=p2.vapp??sp.VLS+5;spdT={0:sp.GD,1:sp.S,2:sp.F,3:Math.max(vapp,sp.F-10),FULL:vapp}[FL.conf]??vapp}}
      if(FL.ver==='FLARE')spdT=Math.min(spdT,FL.ias-1)}
    /* ---- phases ---- */
    if(S.phase==='CLB'&&FL.ver==='ALT'&&Math.abs(FL.alt-crz)<50)S.phase='CRZ';
    if((S.phase==='CRZ'||S.phase==='CLB')&&FL.s>FL.path.len*0.4&&vsT<0&&(DESCENDING.includes(FL.ver)||FL.ver==='V/S'||FL.ver==='FPA')&&FL.alt<crz-200)S.phase='DES';
    if(S.phase==='DES'&&dtg<25)S.phase='APPR';
    /* ---- configuration (PM) ---- */
    /* deceleration: 12 NM flaps 1 (S speed), 8 NM flaps 2 (F speed) and gear down, 5 NM approach speed */
    if(S.phase==='APPR'){const cf=dtg>12?'0':dtg>8?'1':dtg>5?'2':dtg>4?'3':(p2.conf3?'3':'FULL');FL.conf=cf;FL.gear=dtg<=8}
    else{if(FL.conf==='1+F'&&FL.ias>sp.F)FL.conf='1';if(FL.conf==='1'&&FL.ias>sp.S)FL.conf='0';if(FL.gear&&agl()>200)FL.gear=false}
    if(FL.ver==='FLARE'&&agl()<=1&&FL.vs<=0){FL.ground=true;FL.stage='ROLLOUT';FL.ver='ROLL OUT';FL.lat='ROLL OUT';FL.alt=gnd;FL.vs=0;FCU.ap1=FCU.ap2=false;FCU.athr=false}}
  if(FL.stage==='ROLLOUT'){FL.ias=Math.max(0,FL.ias-4.5*dt);FL.pitch=Math.max(0,FL.pitch-2*dt);
    const lg=locGeo(FL.pos),d=destRwy();trkT=brg(FL.pos,dst(d.r.pos,lg.crs+180,lg.along-1));if(FL.ias<=0){FL.stage='STOP';S.phase='DONE';FL.running=false}}
  if(FL.stage==='ROLL'){const o=DB.apt[orig()],r=o.rwy[S.active.rwy];trkT=r.crs+(o.var||0)}

  FL.spdT=spdT;vsT=Math.max(-6000,Math.min(6000,vsT));
  /* ---- dynamics ---- */
  if(FL.stage==='AIR'){FL.ias+=Math.max(-1.6*dt,Math.min(1.6*dt,spdT-FL.ias));FL.vs+=Math.max(-600*dt,Math.min(600*dt,vsT-FL.vs));FL.alt+=FL.vs/60*dt}
  else if(FL.ground)FL.alt=gnd;
  FL.tas=tasOf(FL.ias,FL.alt);FL.gs=FL.ground?FL.ias:FL.tas;FL.mach=FL.tas/sos(FL.alt);
  const dh=((trkT-FL.trkT+540)%360)-180,rate=Math.max(-3,Math.min(3,dh*0.6));FL.trkT=(FL.trkT+rate*dt+360)%360;FL.hdgT=FL.trkT;
  const bank=FL.ground?0:Math.max(-30,Math.min(30,Math.atan(rate*D2R*FL.tas*0.5144/9.81)/D2R));FL.roll+=Math.max(-5*dt,Math.min(5*dt,bank-FL.roll));
  FL.pos=dst(FL.pos,FL.trkT,FL.gs*KT2NMS*dt);
  if(FL.stage==='AIR'){const fpa=Math.atan2(FL.vs,Math.max(60,FL.gs)*101.27)/D2R,aoa=FL.conf==='0'?2.5:FL.conf==='FULL'?4:3.5;
    FL.pitch+=Math.max(-2*dt,Math.min(2*dt,(FL.ver==='SRS'?15:fpa+aoa)-FL.pitch))}
  const ff=FL.stage==='ROLL'||FL.thr==='TO'?5.6:CLIMBING.includes(FL.ver)||FL.ver==='SRS'?3.2:DESCENDING.includes(FL.ver)?0.7:FL.ground?0.4:FL.alt>20000?PM.ff(I().crz,I().ci)*PM.wf(gwNowF()):2.4;
  FL.fob=Math.max(0,FL.fob-ff*dt/3600);FL.t+=dt}

/* ---------- loop ---------- */
function flightTick(dtReal){if(!FL.active)return;let dt=dtReal*FL.rate;while(dt>0){const h=Math.min(0.5,dt);step(h);dt-=h;if(!FL.running)break}setFma();refreshAll()}
function refreshAll(){if(typeof render==='function')render();if(window.drawPFD2D)drawPFD2D();if(window.drawFcu)drawFcu();flightUI()}
let _lastFrame=null,_acc=0;
function frame(ts){if(FL.active&&FL.running){if(_lastFrame!=null){const d=Math.min(0.25,(ts-_lastFrame)/1000);_acc+=d;if(_acc>=0.1){flightTick(_acc);_acc=0}}}_lastFrame=ts;requestAnimationFrame(frame)}
requestAnimationFrame(frame);
function flightSkip(cond){if(!FL.active)return;let n=0;while(!cond()&&FL.stage!=='STOP'&&n<40000){step(0.5);if(n%20===0)setFma();n++}setFma();refreshAll()}

/* ---------- UTC in flight ---------- */
function utcStr(ms){const d=new Date(ms);return String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0')}

/* ---------- control bar ---------- */
function flightUI(){const host=$('#flight');if(!host)return;const miss=FL.active?[]:flightReady();
  const st=$('#flState'),rd=$('#flReady');
  if(st)st.innerHTML=FL.active?`<b>${S.phase}</b><span>${Math.max(0,FL.path.sThr-FL.s).toFixed(0)} NM to go</span><span>${Math.floor(FL.t/60)} min</span><span>${FL.conf==='0'?'CLEAN':'CONF '+FL.conf}${FL.gear?' · GEAR DOWN':''}</span>`:`<b>READY?</b><span>${miss.length?'Complete first:':'All set. Press START.'}</span>`;
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
  else if(k==='td')flightSkip(()=>FL.s>=FL.td-5||FL.tdReached);
  else if(k==='appr')flightSkip(()=>FL.path.sThr-FL.s<=30);
  refreshAll()}
{const host=$('#flight');if(host)host.querySelectorAll('[data-fl]').forEach(b=>b.addEventListener('click',()=>flightBtn(b.dataset.fl)))}
window.__FL=FL;window.__flight=flightBtn;window.__flSkip=flightSkip;
