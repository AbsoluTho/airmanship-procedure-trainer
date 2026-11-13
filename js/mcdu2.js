'use strict';
/* ================= MCDU pages, part 2 =================
   IRS INIT, WIND, RAD NAV, VERT REV, PERF CLB/CRZ/DES/APPR/GA, SEC INDEX, DATA INDEX,
   FUEL PRED and PROG. Page layouts follow the FlyByWire A32NX MCDU (GPL-3.0,
   https://github.com/flybywiresim/aircraft). Figures come from the simplified model in perf.js. */

/* ---------- extra state (kept across RESET MCDU through freshState) ---------- */
const PHASES=['PREFLIGHT','TAKEOFF','CLB','CRZ','DES','APPR','GA','DONE'];
function extraState(){return{phase:'PREFLIGHT',irsT0:Date.now(),irsRef:false,
  wind:{clb:[],crz:[],des:[]},rad:{vor1:null,vor2:null,crs1:null,crs2:null,ls:null,lsCrs:null,adf1:null,adf2:null},
  spdLim:{clb:null,des:null},vr:0,windFrom:'INIT',
  p2:{clbSel:null,crzSel:null,cabin:null,qnh:null,temp:null,wdir:null,wspd:null,ta:null,baro:null,radio:null,vapp:null,conf3:false,gaThr:null,gaAcc:null,gaEo:null},
  apprArm:false,sec:null,secOff:0,secMode:false,fpOffMain:0,dataPg:1,lookup:{wpt:null,nav:null,rwy:null},prog:{to:null},caFreeze:null}}
{const base=freshState;freshState=function(){return Object.assign(base(),extraState())}}
Object.assign(S,extraState());

/* ---------- helpers ---------- */
const cat=(r,t,col,s)=>put(r,Math.floor((COLS-String(t).length)/2),t,col,s);   /* centred text */
const llLat=p=>fmtLL(p).split('/')[0],llLon=p=>fmtLL(p).split('/')[1];
const fl=v=>v==null?'-----':v>=10000&&v%100===0&&v>=(TA[orig()]||18000)?'FL'+String(v/100).padStart(3,'0'):String(v);
const fmtWAlt=a=>a>=10000?'FL'+String(Math.round(a/100)).padStart(3,'0'):String(a).padStart(5,' ');
const phaseIs=p=>S.phase===p;
const ttl=(t,active)=>cput(1,t,active?'g':'w');
function navLookup(id){return DB.nav&&DB.nav[id]||null}
function anyPos(id){if(DB.wpt[id])return DB.wpt[id];if(DB.nav&&DB.nav[id])return DB.nav[id].pos;if(DB.apt[id])return DB.apt[id].pos;return null}
function destId(){const p=S.active;return p?p.legs[idxK(p,'dest')].id:null}
function destElev(){const d=destId();if(!d)return 0;const p=S.active,dl=p.legs[idxK(p,'dest')],a=DB.apt[d];return dl.rwy&&a.rwy[dl.rwy]&&a.rwy[dl.rwy].tdze!=null?a.rwy[dl.rwy].tdze:a.elev}
function bottomPhase(prev,next){if(prev){put(12,1,'PREV','w','S');put(13,0,'<PHASE')}if(next){rput(12,'NEXT ','w','S');rput(13,'PHASE>')}}
function pFmt(v){return v==null?null:v}
/* managed speeds from the cost index (approximation) */
const mgd={clb:()=>Math.min(310,Math.round(280+(I().ci||0)*0.5)),crzM:()=>Math.min(0.80,0.76+(I().ci||0)*0.0008),des:()=>Math.min(320,Math.round(280+(I().ci||0)*0.6))};
const mach=m=>'.'+Math.round(m*100);

/* ---------- INIT A links (IRS INIT>, WIND>) ---------- */
{const lsk0=P.INIT.lsk;P.INIT.lsk=function(s,n){const k=s+n;
  if(k==='R3'){if(!I().from)return err('NOT ALLOWED');return go('IRSINIT')}
  if(k==='R4'){if(!I().from)return err('NOT ALLOWED');S.windFrom='INIT';return go('CLBW')}
  return lsk0.call(this,s,n)}}

/* ---------- IRS INIT ---------- */
const ALIGN_S=90;   /* simulated alignment time, seconds */
P.IRSINIT={render(){const o=orig(),ref=o?DB.apt[o].pos:null,gps=acState().pos;
  cput(1,'IRS INIT');
  put(2,0,'LAT↕','w','S');rput(2,'↕LONG','w','S');cat(2,'REFERENCE','w','S');
  if(ref){put(3,0,llLat(ref),'b');rput(3,llLon(ref),'b');cat(3,o,'g')}
  put(4,0,'LAT','w','S');rput(4,'LONG','w','S');cat(4,'GPS POSITION','w','S');
  put(5,0,llLat(gps),'g');rput(5,llLon(gps),'g');
  const el=(Date.now()-S.irsT0)/1000,done=el>=ALIGN_S,on=S.irsRef?'REF':'GPS',pos=S.irsRef&&ref?ref:gps;
  [1,2,3].forEach(i=>{cat(4+2*i,`IRS${i} ${done?'ALIGNED':'ALIGNING'} ON ${on}`,'w','S');cat(5+2*i,fmtLL(pos),'g')});
  put(13,0,'<RETURN');if(!S.irsRef)rput(13,'ALIGN ON REF→','b')},
 lsk(s,n){if(s+n==='L6')return go('INIT');if(s+n==='R6'){if(S.irsRef)return;S.irsRef=true;S.irsT0=Date.now();return}return err('NOT ALLOWED')}};

/* ---------- WIND pages (CLIMB, CRZ, DES) ---------- */
function parseWind(v,crz){const m=v.match(/^(\d{1,3})\/(\d{1,3})\/(FL)?(\d{1,5})$/);if(!m)return'F';
  const d=+m[1],sp=+m[2];let a=m[3]?+m[4]*100:(m[4].length<=3?+m[4]*100:+m[4]);
  if(d>360||sp>250||a<0||a>45000)return'R';return{dir:d%360,spd:sp,alt:a}}
function windRows(list,first,max,emptyLabel){for(let j=0;j<max;j++){const r=first+2*j,w=list[j];
  if(w)put(r,0,String(w.dir).padStart(3,'0')+'°/'+String(w.spd).padStart(3,'0')+'/'+fmtWAlt(w.alt).trim(),'b');
  else{put(r,0,'[ ]°/[ ]/[   ]','b');break}}}
function windLsk(list,first,max,n,desc){const v=S.sp,j=n-first;if(j<0||j>=max)return false;if(!v)return true;
  if(v==='CLR'){if(list[j]){list.splice(j,1);ok()}else err('NOT ALLOWED');return true}
  if(j>list.length)return err('NOT ALLOWED'),true;const w=parseWind(v);if(w==='F')return err('FORMAT ERROR'),true;if(w==='R')return err('ENTRY OUT OF RANGE'),true;
  if(list[j])list[j]=w;else list.push(w);list.sort((a,b)=>desc?b.alt-a.alt:a.alt-b.alt);ok();return true}
function firstCrzWpt(){const p=S.active;if(!p)return null;const l=p.legs.find(x=>x.k==='wpt'&&x.seg==='enr');return l?l.id:null}
P.CLBW={render(){cput(1,'CLIMB WIND');put(2,0,'TRU WIND/ALT','w','S');rput(2,'HISTORY ','w','S');rput(3,'WIND>');
  rput(4,'WIND/TEMP ','a','S');rput(5,'REQUEST*','a');windRows(S.wind.clb,3,5);rput(10,'NEXT ','w','S');rput(11,'PHASE>');put(13,0,'<RETURN')},
 lsk(s,n){if(s==='L'&&n===6)return go(S.windFrom);if(s==='R'&&n===5)return go('CRZW');if(s==='R')return err('NOT IN PROTOTYPE');if(!windLsk(S.wind.clb,1,5,n,false))err('NOT ALLOWED')}};
P.CRZW={render(){const w=firstCrzWpt();cput(1,'CRZ WIND');if(w)csegs(2,[['AT ','w','S'],[w.padEnd(7),'g']]);
  put(4,0,'TRU WIND/ALT','w','S');rput(4,'WIND/TEMP ','a','S');rput(5,'REQUEST*','a');windRows(S.wind.crz,5,4);
  rput(8,'PREV ','w','S');rput(9,'PHASE>');rput(10,'NEXT ','w','S');rput(11,'PHASE>');put(13,0,'<RETURN')},
 lsk(s,n){if(s==='L'&&n===6)return go(S.windFrom);if(s==='R'&&n===4)return go('CLBW');if(s==='R'&&n===5)return go('DESW');if(s==='R')return err('NOT IN PROTOTYPE');
  if(!windLsk(S.wind.crz,3,4,n,false))err('NOT ALLOWED')}};
P.DESW={render(){cput(1,'DES WIND');put(2,0,'TRU WIND/ALT','w','S');rput(4,'WIND/TEMP ','a','S');rput(5,'REQUEST*','a');windRows(S.wind.des,3,5);
  rput(8,'PREV ','w','S');rput(9,'PHASE>');put(13,0,'<RETURN')},
 lsk(s,n){if(s==='L'&&n===6)return go(S.windFrom);if(s==='R'&&n===4)return go('CRZW');if(s==='R')return err('NOT IN PROTOTYPE');if(!windLsk(S.wind.des,1,5,n,true))err('NOT ALLOWED')}};

/* ---------- RAD NAV ---------- */
const isVor=n=>n&&/VOR|DME|TACAN/.test(n.type),isNdb=n=>n&&/NDB/.test(n.type);
function radText(x,left,fmt){if(!x)return left?'[  ]/[ . ]':'[ . ]/[  ]';const id=x.id||'',f=x.freq!=null?fmt(x.freq):'---.--';return left?(id?id+'/':'[  ]/')+f:f+(id?'/'+id:'/[  ]')}
P.RADNAV={render(){const r=S.rad,p=S.active;
  cput(1,'RADIO NAV');put(2,0,'VOR1/FREQ','w','S');rput(2,'FREQ/VOR2','w','S');
  put(3,0,radText(r.vor1,true,f=>f.toFixed(2)),'b');rput(3,radText(r.vor2,false,f=>f.toFixed(2)),'b');
  put(4,0,'CRS','w','S');rput(4,'CRS','w','S');put(5,0,r.crs1!=null?String(r.crs1).padStart(3,'0'):'[ ]','b');rput(5,r.crs2!=null?String(r.crs2).padStart(3,'0'):'[ ]','b');
  put(6,1,'LS /FREQ','w','S');
  const ap=p&&p.appr&&(APPRS[destId()]||{})[p.appr];               /* FMGS autotunes the LS of the selected approach */
  const ls=r.ls||(ap&&/^ILS|^LOC/.test(p.appr)?{id:ap.nav,freq:null,auto:true}:null);
  if(ls)put(7,0,(ls.id?ls.id+'/':'[  ]/')+(ls.freq!=null?ls.freq.toFixed(2):'---.--'),'b',ls.auto?'S':'L');else put(7,0,'[  ]/[ . ]','b');
  put(8,0,'CRS','w','S');const lc=r.lsCrs!=null?r.lsCrs:(ls&&ls.auto?ap.crs:null);put(9,0,lc!=null?'F'+String(lc).padStart(3,'0'):'[ ]','b',r.lsCrs==null&&lc!=null?'S':'L');
  put(10,0,'ADF1/FREQ','w','S');rput(10,'FREQ/ADF2','w','S');
  put(11,0,radText(r.adf1,true,f=>f.toFixed(1)),'b');rput(11,radText(r.adf2,false,f=>f.toFixed(1)),'b')},
 lsk(s,n){const r=S.rad,v=S.sp,k=s+n;if(!v)return;const C=v==='CLR';
  const tune=(key,ndb)=>{if(C){r[key]=null;return ok()}
    if(/^\d{2,4}(\.\d{1,2})?$/.test(v)){const f=+v;if(ndb?(f<190||f>1750):(f<108||f>117.95))return err('ENTRY OUT OF RANGE');
      const hit=Object.entries(DB.nav||{}).find(([,x])=>x.freq===f&&(ndb?isNdb(x):isVor(x)));r[key]={id:hit?hit[0]:null,freq:f};return ok()}
    if(!/^[A-Z0-9]{1,4}$/.test(v))return err('FORMAT ERROR');const x=navLookup(v);if(!x||(ndb?!isNdb(x):!isVor(x)))return err('NOT IN DATA BASE');
    r[key]={id:v,freq:x.freq};return ok()};
  const crs=key=>{if(C){r[key]=null;return ok()}if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');if(+v>360)return err('ENTRY OUT OF RANGE');r[key]=+v%360;return ok()};
  switch(k){case'L1':return tune('vor1');case'R1':return tune('vor2');case'L2':return crs('crs1');case'R2':return crs('crs2');
  case'L3':{if(C){r.ls=null;return ok()}if(!/^1\d{2}(\.\d{1,2})?$/.test(v))return err('FORMAT ERROR');const f=+v;if(f<108||f>111.95)return err('ENTRY OUT OF RANGE');
    const p=S.active,ap=p&&p.appr&&(APPRS[destId()]||{})[p.appr];r.ls={id:ap?ap.nav:null,freq:f};return ok()}
  case'L4':return crs('lsCrs');case'L5':return tune('adf1',true);case'R5':return tune('adf2',true);default:return err('NOT ALLOWED')}}};

/* ---------- VERT REV (and SPD/ALT entry on the F-PLN right keys) ---------- */
function parseAlt(t){const m=t.match(/^([+-])?(FL)?(\d{1,5})$/);if(!m)return null;const v=m[2]?+m[3]*100:+m[3];
  if(v>39800)return'R';return{t:m[1]||'@',v}}
function legSeg(l){return l.seg==='arr'||l.seg==='map'||l.k==='dest'?'des':'clb'}
function spdLim(ph){return S.spdLim[ph]||{spd:250,alt:10000,def:true}}
function vrevFromFpln(r){const p=cur(),v=S.sp,l=p.legs[r.ix];
  if(l.k!=='wpt')return err('NOT ALLOWED');
  if(!v){S.vr=r.ix;return go('VREV')}
  if(v==='CLR'){delete l.spd;delete l.alt;return ok()}
  const m=v.match(/^(\d{3})?(?:\/(.+))?$/);if(!m||(!m[1]&&!m[2]))return err('FORMAT ERROR');
  if(m[1]){const sp=+m[1];if(sp<100||sp>399)return err('ENTRY OUT OF RANGE')}
  let a=null;if(m[2]){a=parseAlt(m[2]);if(!a)return err('FORMAT ERROR');if(a==='R')return err('ENTRY OUT OF RANGE')}
  if(m[1])l.spd=+m[1];if(a)l.alt=a;return ok()}
P.VREV={render(){const p=cur(),l=p.legs[S.vr];if(!l){S.page='FPLN';return P.FPLN.render()}
  csegs(1,[['VERT REV ','w'],['AT','w','S'],[' '+l.id,'g']]);
  const ph=legSeg(l),sl=spdLim(ph);put(4,0,ph==='clb'?'CLB SPD LIM':'DES SPD LIM','w','S');
  put(5,0,sl.spd+'/'+sl.alt,'b',sl.def?'S':'L');rput(5,'RTA>');
  put(6,1,'SPD CSTR','w','S');rput(6,'ALT CSTR','w','S');
  put(7,0,l.spd?String(l.spd):'[ ]','b');rput(7,l.alt?fAlt(l.alt):'[   ]','b');
  put(11,0,'<WIND/TEMP');put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),l=p.legs[S.vr],v=S.sp,k=s+n;
  if(k==='L6')return go('FPLN');if(k==='L5'){S.windFrom='VREV';return go(legSeg(l)==='des'?'DESW':l.seg==='enr'?'CRZW':'CLBW')}
  if(k==='R2')return err('NOT IN PROTOTYPE');if(!v)return;
  if(k==='L2'){const ph=legSeg(l);if(v==='CLR'){S.spdLim[ph]=null;return ok()}const m=v.match(/^(\d{3})\/(\d{3,5})$/);if(!m)return err('FORMAT ERROR');
    const sp=+m[1],a=m[2].length<=3?+m[2]*100:+m[2];if(sp<100||sp>350||a>39000)return err('ENTRY OUT OF RANGE');S.spdLim[ph]={spd:sp,alt:a};return ok()}
  if(k==='L3'){if(v==='CLR'){delete l.spd;return ok()}if(!/^\d{3}$/.test(v))return err('FORMAT ERROR');if(+v<100||+v>399)return err('ENTRY OUT OF RANGE');l.spd=+v;return ok()}
  if(k==='R3'){if(v==='CLR'){delete l.alt;return ok()}const a=parseAlt(v);if(!a)return err('FORMAT ERROR');if(a==='R')return err('ENTRY OUT OF RANGE');l.alt=a;return ok()}
  return err('NOT ALLOWED')}};

/* ---------- PERF phase pages ---------- */
function perfNav(s,n,prev,next){if(s==='L'&&n===6&&prev){go(prev);return true}if(s==='R'&&n===6&&next){go(next);return true}return false}
function gwNow(){const f=S.fuel;return f.zfw!=null&&f.block!=null?f.zfw+f.block-(f.taxi??0.2):null}
function apprArmRow(){if(!['CLB','CRZ','DES'].includes(S.phase))return false;
  if(S.apprArm){put(12,1,'CONFIRM','a','S');put(13,0,'*APPR PHASE','a')}else{put(12,1,'ACTIVATE','w','S');put(13,0,'{APPR PHASE','b')}return true}
function apprArmLsk(s,n){if(s+n!=='L6'||!['CLB','CRZ','DES'].includes(S.phase))return false;if(S.apprArm){S.phase='APPR';S.apprArm=false;go('PERFAPPR')}else S.apprArm=true;return true}
P.PERFCLB={render(){const i=I(),q=S.p2,pr=predict();ttl('CLB',phaseIs('CLB'));
  put(2,0,'ACT MODE','w','S');put(3,0,q.clbSel?'SELECTED':'MANAGED','g');
  put(4,0,'CI','w','S');put(5,0,i.ci!=null?String(i.ci):'---',i.ci!=null?'b':'w');
  if(i.crz){cat(4,'PRED TO','w','S');rput(5,'FL'+String(i.crz).padStart(3,'0'),'b')}
  put(6,0,'MANAGED','w','S');cat(6,'DIST','w','S');rput(6,'TIME','w','S');
  put(7,0,String(mgd.clb())+'/'+mach(mgd.crzM()),'g','S');
  if(i.crz&&pr){const c=PM.climb(i.crz);cat(7,String(Math.round(c.d)),'g','S');rput(7,hhmm(c.t+2),'g','S')}else{cat(7,'---','w');rput(7,'----','w')}
  put(8,0,phaseIs('CLB')?'SELECTED':'PRESEL','w','S');put(9,0,q.clbSel?String(q.clbSel):'[ ]','b');
  bottomPhase(true,true)},
 lsk(s,n){if(perfNav(s,n,'PERFTO','PERFCRZ'))return;const q=S.p2,v=S.sp;
  if(s+n==='L4'){if(!v)return;if(v==='CLR'){q.clbSel=null;return ok()}if(!/^\d{3}$/.test(v))return err('FORMAT ERROR');if(+v<100||+v>350)return err('ENTRY OUT OF RANGE');q.clbSel=+v;return ok()}
  if(s+n==='L2')return P.INIT.lsk.call(P.INIT,'L',5);return err('NOT ALLOWED')}};
P.PERFCRZ={render(){const i=I(),q=S.p2,pr=predict();ttl('CRZ',phaseIs('CRZ'));
  put(2,0,'ACT MODE','w','S');rput(2,'DEST EFOB','w','S');cat(2,'TIME','w','S');put(3,0,q.crzSel?'SELECTED':'MANAGED','g');
  if(pr){rput(3,f1(S.fuel.block-pr.taxi-pr.trip.fuel),'g');cat(3,hhmm(pr.trip.time),'g')}else{rput(3,'--.-','w');cat(3,'----','w')}
  put(4,0,'CI','w','S');put(5,0,i.ci!=null?String(i.ci):'---',i.ci!=null?'b':'w');
  put(6,0,'MANAGED','w','S');put(7,0,mach(mgd.crzM()),'g','S');
  put(8,0,phaseIs('CRZ')?'SELECTED':'PRESEL','w','S');put(9,0,q.crzSel?(q.crzSel<1?mach(q.crzSel):String(q.crzSel)):'[ ]','b');
  rput(8,'DES CABIN RATE','w','S');segs(9,COLS-11,[[String(q.cabin??-350).padStart(4),'b',q.cabin!=null?'L':'S'],['FT/MN','w','S']]);
  bottomPhase(true,true)},
 lsk(s,n){if(perfNav(s,n,'PERFCLB','PERFDES'))return;const q=S.p2,v=S.sp;if(!v)return;
  if(s+n==='L4'){if(v==='CLR'){q.crzSel=null;return ok()}if(/^\.\d{2}$/.test(v)){const m=+('0'+v);if(m<0.5||m>0.82)return err('ENTRY OUT OF RANGE');q.crzSel=m;return ok()}
    if(!/^\d{3}$/.test(v))return err('FORMAT ERROR');if(+v<100||+v>350)return err('ENTRY OUT OF RANGE');q.crzSel=+v;return ok()}
  if(s+n==='R4'){if(v==='CLR'){q.cabin=null;return ok()}if(!/^-?\d{3,4}$/.test(v))return err('FORMAT ERROR');const x=-Math.abs(+v);if(x<-999||x>-100)return err('ENTRY OUT OF RANGE');q.cabin=x;return ok()}
  return err('NOT ALLOWED')}};
P.PERFDES={render(){const i=I(),pr=predict();ttl('DES',phaseIs('DES'));
  put(2,0,'ACT MODE','w','S');rput(2,'DEST EFOB','w','S');cat(2,'TIME','w','S');put(3,0,'MANAGED','g');
  if(pr){rput(3,f1(S.fuel.block-pr.taxi-pr.trip.fuel),'g');cat(3,hhmm(pr.trip.time),'g')}else{rput(3,'--.-','w');cat(3,'----','w')}
  put(4,0,'CI','w','S');put(5,0,i.ci!=null?String(i.ci):'---',i.ci!=null?'b':'w');
  put(6,0,'MANAGED','w','S');cat(6,'DIST','w','S');rput(6,'TIME','w','S');put(7,0,mach(mgd.crzM())+'/'+mgd.des(),'g','S');cat(7,'---','w');rput(7,'----','w');
  if(!apprArmRow())bottomPhase(true,true);else rput(12,'NEXT ','w','S'),rput(13,'PHASE>')},
 lsk(s,n){if(apprArmLsk(s,n))return;if(perfNav(s,n,'PERFCRZ','PERFAPPR'))return;return err('NOT ALLOWED')}};
function vls(lw,conf3){return Math.round(0.95*lw+74+(conf3?4:0))}
P.PERFAPPR={render(){const q=S.p2,pr=predict(),d=destId(),lw=pr?pr.lw:null,cs=lw?charSpeeds(lw):null;ttl('APPR',phaseIs('APPR'));
  const req=['DES','APPR'].includes(S.phase);   /* QNH and TEMP become amber boxes once DES is active */
  put(2,0,'QNH','w','S');put(3,0,q.qnh!=null?String(q.qnh):(req?'____':'[    ]'),q.qnh!=null||!req?'b':'a');
  put(4,0,'TEMP','w','S');rput(4,'BARO','w','S');
  put(5,0,q.temp!=null?String(q.temp)+'°':(req?'___°':'[ ]°'),q.temp!=null||!req?'b':'a');put(5,10,'O=','w');put(5,12,cs?String(cs.O):'---',cs?'g':'w');
  rput(5,q.baro!=null?String(q.baro):'[    ]','b');
  put(6,0,'MAG WIND','w','S');rput(6,'RADIO','w','S');
  put(7,0,d?(q.wdir!=null?String(q.wdir).padStart(3,'0')+'°/'+String(q.wspd).padStart(3,'0'):'[ ]°/[ ]'):'---°/---',d?'b':'w');put(7,10,'S=','w');put(7,12,cs?String(cs.S):'---',cs?'g':'w');
  rput(7,q.radio!=null?(q.radio==='NO'?'NO':String(q.radio)):'[   ]','b');
  put(8,0,'TRANS ALT','w','S');put(9,0,String(q.ta??(d&&TA[d]||'-----')),'b',q.ta!=null?'L':'S');put(9,10,'F=','w');put(9,12,cs?String(cs.F):'---',cs?'g':'w');
  put(10,0,'VAPP','w','S');put(10,7,'VLS','w','S');rput(10,'LDG CONF ','w','S');
  const vl=lw?vls(lw,q.conf3):null,hw=q.wdir!=null&&d&&S.active?Math.max(0,q.wspd*Math.cos(((q.wdir-(DB.apt[d].rwy[S.active.legs[idxK(S.active,'dest')].rwy]||{crs:q.wdir}).crs)*D2R))):0;
  const va=q.vapp??(vl?vl+Math.round(Math.min(15,Math.max(5,hw/3))):null);
  put(11,0,va?String(va):'---',va?'b':'w',q.vapp!=null?'L':'S');put(11,7,vl?String(vl):'---',vl?'g':'w');
  if(q.conf3)segs(11,COLS-11,[['CONF3/','b'],['FULL','w','S'],['*','b']]);else segs(11,COLS-11,[['FULL/','b'],['CONF3','w','S'],['*','b']]);
  if(!apprArmRow())bottomPhase(true,true);else rput(12,'NEXT ','w','S'),rput(13,'PHASE>')},
 lsk(s,n){if(apprArmLsk(s,n))return;if(perfNav(s,n,'PERFDES','PERFGA'))return;const q=S.p2,v=S.sp,k=s+n,C=v==='CLR';
  if(k==='R5'){q.conf3=!q.conf3;q.vapp=null;return}
  if(!v)return;
  switch(k){
  case'L1':{if(C){q.qnh=null;return ok()}if(/^\d{2}\.\d{2}$/.test(v)){const x=+v;if(x<22||x>32.48)return err('ENTRY OUT OF RANGE');q.qnh=v;return ok()}
    if(!/^\d{3,4}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<745||x>1100)return err('ENTRY OUT OF RANGE');q.qnh=x;return ok()}
  case'L2':{if(C){q.temp=null;return ok()}if(!/^[+-]?\d{1,2}$/.test(v))return err('FORMAT ERROR');q.temp=+v;return ok()}
  case'L3':{if(!destId())return err('NOT ALLOWED');if(C){q.wdir=q.wspd=null;return ok()}const m=v.match(/^(\d{1,3})\/(\d{1,3})$/);if(!m)return err('FORMAT ERROR');
    if(+m[1]>360||+m[2]>200)return err('ENTRY OUT OF RANGE');q.wdir=+m[1]%360;q.wspd=+m[2];return ok()}
  case'L4':{if(C){q.ta=null;return ok()}if(!/^\d{3,5}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<1000||x>39000)return err('ENTRY OUT OF RANGE');q.ta=Math.round(x/10)*10;return ok()}
  case'L5':{if(C){q.vapp=null;return ok()}if(!/^\d{3}$/.test(v))return err('FORMAT ERROR');if(+v<90||+v>350)return err('ENTRY OUT OF RANGE');q.vapp=+v;return ok()}
  case'R2':{if(C){q.baro=null;return ok()}if(!/^\d{1,5}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<destElev()-500||x>destElev()+5000)return err('ENTRY OUT OF RANGE');q.baro=x;q.radio=null;return ok()}
  case'R3':{if(C){q.radio=null;return ok()}if(v==='NO'||v==='NODH'){q.radio='NO';q.baro=null;return ok()}if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');if(+v>700)return err('ENTRY OUT OF RANGE');q.radio=+v;q.baro=null;return ok()}
  default:return err('NOT ALLOWED')}}};
function defGa(){return Math.round((destElev()+1500)/10)*10}
P.PERFGA={render(){const q=S.p2,pr=predict(),cs=pr?charSpeeds(pr.lw):null;cput(1,'GO AROUND',phaseIs('GA')?'g':'w');
  put(2,6,'FLP RETR','w','S');put(3,8,'F=','w');put(3,10,cs?String(cs.F):'---',cs?'g':'w');
  put(4,6,'SLT RETR','w','S');put(5,8,'S=','w');put(5,10,cs?String(cs.S):'---',cs?'g':'w');
  put(6,8,'CLEAN','w','S');put(7,8,'O=','w');put(7,10,cs?String(cs.O):'---',cs?'g':'w');
  put(10,0,'THR RED/ACC','w','S');rput(10,'ENG OUT ACC','w','S');
  segs(11,0,[[String(q.gaThr??defGa()).padStart(5),'b',q.gaThr!=null?'L':'S'],['/','b'],[String(q.gaAcc??defGa()).padEnd(5),'b',q.gaAcc!=null?'L':'S']]);
  rput(11,String(q.gaEo??defGa()).padStart(5),'b',q.gaEo!=null?'L':'S');bottomPhase(true,false)},
 lsk(s,n){if(perfNav(s,n,'PERFAPPR',null))return;const q=S.p2,v=S.sp,k=s+n;if(!v)return;const C=v==='CLR',minA=destElev()+400;
  if(k==='L5'){if(C){q.gaThr=q.gaAcc=null;return ok()}const m=v.match(/^(\d{3,5})?(?:\/(\d{3,5}))?$/);if(!m||(!m[1]&&!m[2]))return err('FORMAT ERROR');
    const t=m[1]?+m[1]:(q.gaThr??defGa()),a=m[2]?+m[2]:Math.max(q.gaAcc??defGa(),t);if(t<minA||a<t||a>39000)return err('ENTRY OUT OF RANGE');
    if(m[1])q.gaThr=Math.round(t/10)*10;if(m[2]||a!==(q.gaAcc??defGa()))q.gaAcc=Math.round(a/10)*10;return ok()}
  if(k==='R5'){if(C){q.gaEo=null;return ok()}if(!/^\d{3,5}$/.test(v))return err('FORMAT ERROR');if(+v<minA||+v>39000)return err('ENTRY OUT OF RANGE');q.gaEo=Math.round(+v/10)*10;return ok()}
  return err('NOT ALLOWED')}};
/* PERF TAKE OFF: NEXT PHASE now opens PERF CLB */
{const lsk0=P.PERFTO.lsk;P.PERFTO.lsk=function(s,n){if(s+n==='R6')return go('PERFCLB');return lsk0.call(this,s,n)}}
const PERF_OF={PREFLIGHT:'PERFTO',TAKEOFF:'PERFTO',CLB:'PERFCLB',CRZ:'PERFCRZ',DES:'PERFDES',APPR:'PERFAPPR',GA:'PERFGA',DONE:'PERFTO'};

/* ---------- SEC INDEX and SEC F-PLN ---------- */
P.SECIDX={render(){cput(1,'SEC INDEX');put(3,0,'{COPY ACTIVE','b');rput(3,'INIT>');put(5,0,'<SEC F-PLN');rput(5,'PERF>');
  if(S.sec){put(7,0,'*DELETE SEC','b');put(9,0,'*ACTIVATE SEC','b');put(13,0,'*SWAP ACTIVE','b')}},
 lsk(s,n){const k=s+n;
  if(k==='L1'){if(!S.active)return err('NOT ALLOWED');S.sec=clone(S.active);S.secOff=0;return}
  if(k==='L2'){if(!S.sec)return err('NOT ALLOWED');S.secMode=true;S.fpOffMain=S.fpOff;S.fpOff=S.secOff||0;return go('FPLN')}
  if(k==='L3'&&S.sec){S.sec=null;return}
  if(k==='L4'&&S.sec){if(flying())return err('NOT ALLOWED');S.active=S.sec;S.sec=null;S.tmpy=null;S.fpOff=0;return}
  if(k==='L6'&&S.sec){if(flying())return err('NOT ALLOWED');const a=S.active;S.active=S.sec;S.sec=a;S.tmpy=null;S.fpOff=0;return}
  return err('NOT IN PROTOTYPE')}};
/* ---------- FUEL PRED ---------- */
P.FUELPRED={render(){const f=S.fuel,pr=predict(),d=destId(),al=I().altn,D='---.-',T='----';
  cput(1,'FUEL PRED');put(2,1,'AT','w','S');cat(2,'TIME','w','S');rput(2,'EFOB','w','S');
  put(3,0,d||'----',d?'g':'w');put(5,0,al||'----',al?'g':'w');
  if(pr){const ef=f.block-pr.taxi-pr.trip.fuel;cat(3,hhmm(pr.trip.time),'g');rput(3,f1(ef),'g');
    if(al){cat(5,hhmm(pr.trip.time+pr.altn.time),'g');rput(5,f1(ef-pr.altn.fuel),'g')}}
  else{cat(3,T,'w');rput(3,D,'w')}
  put(6,0,'RTE RSV/%','w','S');rput(6,'ZFW/ZFWCG','w','S');
  segs(7,0,[[pr?f1(pr.rsv):D,pr?'b':'w',pr&&f.rsv==null?'S':'L'],['/','w'],[(pr?pr.pct:(f.rsvPct??5)).toFixed(1),'b',f.rsvPct!=null?'L':'S']]);
  rput(7,f.zfw!=null?f1(f.zfw)+'/'+f1(f.cg):BOX+BOX+'.'+BOX+'/'+BOX+BOX+'.'+BOX,f.zfw!=null?'b':'a');
  put(8,0,'ALTN /TIME','w','S');rput(8,'FOB','w','S');
  segs(9,0,[[pr?f1(pr.altn.fuel):D,pr?'b':'w',pr&&f.altn==null?'S':'L'],['/','w'],[pr?hhmm(pr.altn.time):T,pr?'g':'w','S']]);
  rput(9,f.block!=null?f1(f.block):D,f.block!=null?'g':'w');
  put(10,0,'FINAL/TIME','w','S');rput(10,'GW/   CG','w','S');
  segs(11,0,[[pr?f1(pr.final.fuel):D,pr?'b':'w',pr&&f.final==null?'S':'L'],['/','w'],[hhmm(pr?pr.final.time:(f.finalTime??30)),'b',f.finalTime!=null?'L':'S']]);
  const gw=f.zfw!=null&&f.block!=null?f.zfw+f.block:null;rput(11,gw?f1(gw)+'/ '+f1(f.cg):D+'/ --.-',gw?'g':'w');
  put(12,0,'MIN DEST FOB','w','S');rput(12,'EXTRA/TIME','w','S');
  put(13,0,pr?f1(pr.minFob):D,pr?'b':'w',pr&&f.minFob==null?'S':'L');
  rput(13,pr?f1(pr.extra.fuel)+'/'+hhmm(Math.abs(pr.extra.time)):D+'/'+T,pr?(pr.extra.fuel<0?'a':'g'):'w',pr?'S':'L')},
 lsk(s,n){const map={R3:['R',1],L3:['L',3],L4:['L',4],L5:['L',5],L6:['L',6]}[s+n];if(!map)return err('NOT ALLOWED');return P.INITB.lsk.call(P.INITB,map[0],map[1])}};

/* ---------- PROG ---------- */
function recMax(){const gw=gwNow();if(gw==null)return null;return Math.min(398,Math.floor((398-Math.max(0,gw-56)*3.2)/10)*10)}
P.PROG={render(){const i=I(),rm=recMax(),opt=rm?Math.min(rm,Math.round((rm-20-(I().ci||0)*0.1)/10)*10):null;
  segs(1,0,[[S.phase.padStart(12),'g'],[' '+(i.flt||''),'w']]);
  put(2,1,'CRZ','w','S');rput(2,'OPT    REC MAX','w','S');
  put(3,0,i.crz?'FL'+String(i.crz).padStart(3,'0'):'-----',i.crz?'b':'w');
  segs(3,COLS-17,[[opt?'FL'+String(opt).padStart(3,'0'):'-----',opt?'g':'w'],['    ','w'],[rm?'FL'+String(rm).padStart(3,'0'):'-----',rm?'m':'w'],[' ','w']]);
  put(5,0,'<REPORT');put(8,2,'BRG / DIST','w','S');
  const to=S.prog.to,ac=acState().pos,tp=to?anyPos(to):null;
  if(tp){const b=Math.round((brg(ac,tp)-acState().vr+360)%360)||360,d=gc(ac,tp);put(9,0,String(b).padStart(3,'0')+'°/'+(d<100?d.toFixed(1):String(Math.round(d))).padStart(5),'g')}else put(9,0,'---°/----.-','w');
  segs(9,COLS-9,[['TO','w','S'],[' ','w'],[to?to.padEnd(6):'[    ]','b']]);
  put(10,1,'PREDICTIVE','w','S');put(11,0,'<GPS');rput(11,'GPS PRIMARY','g');
  put(12,0,'REQUIRED','w','S');cat(12,'ACCUR','w','S');rput(12,'ESTIMATED','w','S');
  put(13,0,'1.0NM','b');cat(13,'HIGH','g');rput(13,'0.05NM','g','S')},
 lsk(s,n){const k=s+n,v=S.sp;
  if(k==='L2')return go('REPORT');if(k==='L5')return go('PREDGPS');
  if(k==='R4'){if(!v)return;if(v==='CLR'){S.prog.to=null;return ok()}if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');if(!anyPos(v))return err('NOT IN DATA BASE');S.prog.to=v;return ok()}
  if(k==='L1'){if(!v)return;return P.INIT.lsk.call(P.INIT,'L',6)}
  return err('NOT ALLOWED')}};
P.REPORT={render(){const t=toWpt(),p=S.active,nx=p?p.legs.filter(l=>l.k==='wpt')[1]:null,d=destId();
  cput(1,'REPORT');put(2,1,'OVHD','w','S');cat(2,'ALT','w','S');rput(2,'UTC','w','S');
  put(4,1,'TO','w','S');put(5,0,t?t.id:'-----','g');put(6,1,'NEXT','w','S');put(7,0,nx?nx.id:'-----','g');
  put(8,1,'SAT','w','S');cat(8,'FOB','w','S');rput(8,'T. WIND','w','S');put(9,0,'[ ]','b');cat(9,S.fuel.block!=null?f1(S.fuel.block):'--.-',S.fuel.block!=null?'g':'w');rput(9,'---°/---','w');
  put(10,1,'S/C','w','S');rput(10,'UTC DIST','w','S');put(12,1,'DEST','w','S');cat(12,'EFOB','w','S');rput(12,'UTC DIST','w','S');put(13,0,d||'----','g')},
 lsk(s,n){if(s+n==='L6'||s+n==='R6')return go('PROG');return err('NOT ALLOWED')}};
P.PREDGPS={render(){const d=destId();cput(1,'PREDICTIVE GPS');put(2,0,'DEST','w','S');rput(2,'ETA','w','S');put(3,0,d||'[  ]',d?'g':'b');cat(3,'PRIMARY','w','S');rput(3,'[    ]','b');
  put(4,2,'-15 -10 -5 ETA+5 +10 +15','w','S');put(5,4,'Y  Y   Y  Y  Y   Y  Y','g','S');put(6,0,'WPT','w','S');rput(6,'ETA','w','S');put(7,0,'[ ]','b');cat(7,'PRIMARY','w','S');
  put(8,2,'-15 -10 -5 ETA+5 +10 +15','w','S');rput(10,'DESELECTED SATELLITES','w','S');put(11,0,'[ ]','b');put(13,0,'<RETURN')},
 lsk(s,n){if(s+n==='L6')return go('PROG');return err('NOT IN PROTOTYPE')}};

/* ---------- DATA INDEX and its sub-pages ---------- */
function airacDates(){const ref=Date.UTC(2025,0,23),now=Date.now(),n=Math.floor((now-ref)/(28*864e5)),a=new Date(ref+n*28*864e5),b=new Date(ref+(n+1)*28*864e5-864e5);
  const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],f=d=>String(d.getUTCDate()).padStart(2,'0')+M[d.getUTCMonth()];return f(a)+'-'+f(b)}
P.DATA={render(){const pg=S.dataPg;cput(1,'DATA INDEX');rput(1,pg+'/2 ','w','S');
  if(pg===1){put(2,1,'POSITION','w','S');put(3,0,'<MONITOR');put(4,1,'IRS','w','S');put(5,0,'<MONITOR');put(6,1,'GPS','w','S');put(7,0,'<MONITOR');
    put(9,0,'<A/C STATUS');put(10,1,'CLOSEST','w','S');put(11,0,'<AIRPORTS');put(12,1,'EQUITIME','w','S');rput(12,'ACARS/PRINT ','w','S');put(13,0,'<POINT');rput(13,'FUNCTION>')}
  else{rput(2,'STORED ','w','S');put(3,0,'<WAYPOINTS');rput(3,'WAYPOINTS>');rput(4,'STORED ','w','S');put(5,0,'<NAVAIDS');rput(5,'NAVAIDS>');
    rput(6,'STORED ','w','S');put(7,0,'<RUNWAYS');rput(7,'RUNWAYS>');rput(8,'STORED ','w','S');put(9,0,'<ROUTES');rput(9,'ROUTES>')}},
 arrow(d){S.dataPg=S.dataPg===1?2:1},
 lsk(s,n){const k=s+n;
  if(S.dataPg===1){const to={L1:'POSMON',L2:'IRSMON',L3:'GPSMON',L4:'IDENT',L5:'CLOSEST'}[k];if(to){if(to==='CLOSEST')S.caFreeze=null;return go(to)}}
  else{const to={L1:'WPTPG',L2:'NAVPG',L3:'RWYPG'}[k];if(to)return go(to)}
  return err('NOT IN PROTOTYPE')}};
P.IDENT={render(){cput(1,'A320-200');put(2,1,'ENG','w','S');put(3,0,'LEAP-1A26','g');put(4,1,'ACTIVE NAV DATA BASE','w','S');
  put(5,1,airacDates(),'b');rput(5,'TRN'+new Date().getUTCFullYear()%100+'01','g');put(6,1,'SECOND NAV DATA BASE','w','S');put(7,1,'NONE','b','S');
  put(10,0,'CHG CODE','w','S');put(11,0,'[ ]','b');put(12,0,'IDLE/PERF','w','S');rput(12,'SOFTWARE  ','w','S');put(13,0,'+0.0/+0.0','g','S');rput(13,'STATUS/XLOAD>')},
 lsk(s,n){return err('NOT IN PROTOTYPE')}};
P.POSMON={render(){const p=acState().pos,l=fmtLL(p);cput(1,'POSITION MONITOR');
  put(3,0,'FMGC1','w');rput(3,l,'g','S');put(5,0,'FMGC2','w');rput(5,l,'g','S');put(7,0,'GPIRS','w');rput(7,l,'g','S');put(9,0,'MIX IRS','w');rput(9,l,'g','S');
  put(10,1,'IRS1','w','S');cat(10,'IRS2','w','S');rput(10,'IRS3','w','S');put(11,0,'NAV 0.0','g','S');cat(11,'NAV 0.0','g','S');rput(11,'NAV 0.0','g','S');
  rput(12,'SEL ','w','S');put(13,0,'<FREEZE');rput(13,'NAVAIDS>')},
 lsk(s,n){return err('NOT IN PROTOTYPE')}};
P.IRSMON={render(){cput(1,'IRS MONITOR');const done=(Date.now()-S.irsT0)/1000>=ALIGN_S;
  [1,2,3].forEach(i=>{put(2*i,1,done?'NAV':'ALIGN','w','S');put(2*i+1,0,'<IRS'+i)})},lsk(s,n){return err('NOT IN PROTOTYPE')}};
P.GPSMON={render(){const p=acState().pos;cput(1,'GPS MONITOR');
  [[2,'GPS1'],[8,'GPS2']].forEach(([r,g])=>{put(r,1,g+' POSITION','w','S');put(r+1,0,fmtLL(p),'g');put(r+2,1,'TTRK','w','S');cat(r+2,'UTC','w','S');rput(r+2,'GPS ALT','w','S');
    put(r+3,0,String(acState().hdg+acState().vr).padStart(5,' ')+'°','g');const t=new Date();cat(r+3,String(t.getUTCHours()).padStart(2,'0')+':'+String(t.getUTCMinutes()).padStart(2,'0')+':'+String(t.getUTCSeconds()).padStart(2,'0'),'g');rput(r+3,String(elevO()),'g');
    put(r+4,1,'MERIT','w','S');cat(r+4,'MODE/SAT','w','S');rput(r+4,'GS','w','S');put(r+5,0,'50FT','g');cat(r+5,'NAV/9','g');rput(r+5,'0','g')})},
 lsk(s,n){return err('NOT IN PROTOTYPE')}};
P.CLOSEST={render(){const ac=S.caFreeze||acState().pos,now=new Date();cput(1,'CLOSEST AIRPORTS');
  const list=Object.entries(DB.apt).map(([id,a])=>({id,d:gc(ac,a.pos),b:brg(ac,a.pos)})).sort((x,y)=>x.d-y.d).slice(0,4);
  put(2,8,'BRG','w','S');put(2,13,'DIST','w','S');rput(2,'UTC','w','S');
  list.forEach((x,j)=>{const r=3+2*j,u=new Date(now.getTime()+x.d/450*36e5);put(r,0,x.id,'g');put(r,7,String(Math.round((x.b-acState().vr+360)%360)||360).padStart(3,'0')+'°','g');
    put(r,12,(x.d<10?x.d.toFixed(1):String(Math.round(x.d))).padStart(5),'g');rput(r,String(u.getUTCHours()).padStart(2,'0')+String(u.getUTCMinutes()).padStart(2,'0'),'g')});
  put(11,0,'[    ]','b');put(13,0,S.caFreeze?'<UNFREEZE':'<FREEZE');rput(12,'EFOB/WIND','w','S');rput(13,'>')},
 lsk(s,n){if(s+n==='L6'){S.caFreeze=S.caFreeze?null:acState().pos;return}return err('NOT IN PROTOTYPE')}};
P.WPTPG={render(){const id=S.lookup.wpt;cput(1,'WAYPOINT');put(2,1,'IDENT','w','S');put(3,0,id||'[    ]',id?'g':'b');
  if(id){put(4,1,'LAT/LONG','w','S');put(5,0,fmtLL(DB.wpt[id]),'g')}put(13,0,'<RETURN')},
 lsk(s,n){const v=S.sp;if(s+n==='L6')return go('DATA');if(s+n!=='L1'||!v)return;if(!DB.wpt[v])return err('NOT IN DATA BASE');S.lookup.wpt=v;ok()}};
P.NAVPG={render(){const id=S.lookup.nav,x=id&&navLookup(id);cput(1,'NAVAID');put(2,1,'IDENT','w','S');put(3,0,id||'[  ]',id?'g':'b');
  if(x){put(4,1,'FREQ','w','S');put(5,0,isNdb(x)?String(x.freq):x.freq.toFixed(2),'g');put(6,1,'LAT/LONG','w','S');put(7,0,fmtLL(x.pos),'g');
    put(8,1,'CLASS','w','S');put(9,0,x.type,'g');rput(8,'MAG VAR','w','S');rput(9,(x.var>=0?'E':'W')+Math.abs(x.var).toFixed(1),'g');put(10,1,'STATION NAME','w','S');put(11,0,(x.name||'').toUpperCase().slice(0,24),'g','S')}
  put(13,0,'<RETURN')},
 lsk(s,n){const v=S.sp;if(s+n==='L6')return go('DATA');if(s+n!=='L1'||!v)return;if(!navLookup(v))return err('NOT IN DATA BASE');S.lookup.nav=v;ok()}};
P.RWYPG={render(){const id=S.lookup.rwy;cput(1,'RUNWAY');put(2,1,'IDENT','w','S');put(3,0,id||'[       ]',id?'g':'b');
  if(id){const a=DB.apt[id.slice(0,4)],r=a.rwy[id.slice(4)];put(4,1,'LENGTH','w','S');rput(4,'CRS','w','S');put(5,0,r.len+'M','g');rput(5,String(r.crs).padStart(3,'0')+'°','g');
    put(6,1,'LAT/LONG','w','S');put(7,0,fmtLL(r.pos),'g');put(8,1,'ELV','w','S');put(9,0,String(r.tdze??a.elev),'g')}
  put(13,0,'<RETURN')},
 lsk(s,n){const v=S.sp;if(s+n==='L6')return go('DATA');if(s+n!=='L1'||!v)return;const m=v.match(/^([A-Z]{4})(\d{2}[LCR]?)$/);if(!m)return err('FORMAT ERROR');
  if(!DB.apt[m[1]]||!DB.apt[m[1]].rwy[m[2]])return err('NOT IN DATA BASE');S.lookup.rwy=v;ok()}};

/* ---------- keys ---------- */
{const press0=press;press=function(k){
  if(S.secMode&&/^(DIR|PROG|PERF|INIT|DATA|FPLN|RADNAV|FUEL|SECF|ATC|MENU|AIRPORT)$/.test(k)){S.secOff=S.fpOff;S.fpOff=S.fpOffMain||0;S.secMode=false}
  if(k==='PERF'){go(PERF_OF[S.phase]||'PERFTO');return render()}
  if(k==='DATA'){S.dataPg=1;go('DATA');return render()}
  if(k==='RADNAV'){go('RADNAV');return render()}
  if(k==='FUEL'){go('FUELPRED');return render()}
  if(k==='SECF'){go('SECIDX');return render()}
  if(k==='PROG'){go('PROG');return render()}
  if(k==='AIRPORT'){const p=cur();go('FPLN');if(p){const rows=fplnRows(p),air=rows.map((r,i)=>(r.k==='orig'||r.k==='dest'||r.k==='altn')?i:-1).filter(i=>i>=0);
    const nx=air.find(i=>i>S.fpOff);S.fpOff=nx!=null?nx:air[0]}return render()}
  if((k==='LEFT'||k==='RIGHT')&&P[S.page].arrow){P[S.page].arrow(k==='RIGHT'?1:-1);return render()}
  return press0(k)};window.__press=press}
/* F-PLN right keys: SPD/ALT entry or VERT REV */
{const lsk0=P.FPLN.lsk;P.FPLN.lsk=function(s,n){if(s==='R'&&n<6){const p=cur();if(!p)return err('NOT ALLOWED');const r=fplnRows(p)[S.fpOff+n-1];if(!r)return;
  if(r.k!=='wpt')return err('NOT ALLOWED');return vrevFromFpln(r)}return lsk0.call(this,s,n)}}
/* phase control for the automatic flight of a later phase (and for tests) */
window.__setPhase=p=>{if(PHASES.includes(p)){S.phase=p;S.apprArm=false;render()}};
