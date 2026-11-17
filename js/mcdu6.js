'use strict';
/* ================= MCDU / FMGC, part 6 =================
   Company routes (CO RTE on INIT A, ROUTE selection page after a FROM/TO entry), INIT REQUEST
   (simulated AOC answer), pilot waypoints (LAT/LONG, PLACE/BRG/DIST, PLACE-BRG/PLACE-BRG; DATA
   STORED WAYPOINTS, NEW WAYPOINT, and in F-PLN, LAT REV and DIR TO entries), STORED ROUTES and the
   MCDU MENU. Page layouts follow the FlyByWire A32NX MCDU (GPL-3.0): A320_Neo_CDU_AvailableFlightPlanPage,
   A320_Neo_CDU_PilotsWaypoint, A320_Neo_CDU_NewWaypoint, A320_Neo_CDU_MenuPage. The company routes
   and the AOC answers are invented for the training exercise. */

/* ---------- company routes (training database) ---------- */
const CO_RTES={
  OEJNOETB1:{from:'OEJN',to:'OETB',altn:'OEMA',rwy:'16C',sid:'MIGD2E',route:[['L677','WEJ'],['V54','TBK']],appr:'ILS24',via:'D179O'},
  OEJNOETB2:{from:'OEJN',to:'OETB',altn:'OEMA',rwy:'16C',sid:'MIGD2E',route:[['L677','WEJ'],['V54','TBK']],appr:'ILS24',via:'D043O'},
  /* routes of the flyadeal OFPs of 15 Nov 2026 (runway, SID, STAR and approach as planned on the OFP; where the OFP has no SID, the runway is a choice) */
  OERKOEMA1:{from:'OERK',to:'OEMA',altn:'OEJN',rwy:'15L',sid:'IVON2E',route:[['Y216','ITSEP']],star:'ITSE1H',appr:'ILS35',via:'MA443'},
  OEMAOERK1:{from:'OEMA',to:'OERK',altn:'OEJN',rwy:'35',sid:'MEDR1K',route:[['M872','ORDEM']],star:'ORDE1A',appr:'ILS15LY',via:'RK621'},
  OEJNOEDF1:{from:'OEJN',to:'OEDF',altn:'OEGS',rwy:'16R',sid:'EGRE2F',route:[['B417','GAS'],['L604','UMENA']],star:'UMEN2L',appr:'ILS16L',via:'RESAN'},
  OEDFOEJN1:{from:'OEDF',to:'OEJN',altn:'OEMA',rwy:'34L',route:[['DCT','KFA'],['H732','OTISU'],['N112','GETOT'],['Q212','KSA'],['G782','VEMEM']],star:'VEME1A',appr:'ILS34L',via:'ITUXI'},
  OEJNOEAB1:{from:'OEJN',to:'OEAB',altn:'OEMA',rwy:'34C',sid:'EGPO2W',route:[['V31','BHA'],['V40','ABH']],appr:'ILS13',via:'ABH'},
  OEABOEJN1:{from:'OEAB',to:'OEJN',altn:'OEMA',rwy:'13',sid:'RWYHDG',route:[['DCT','ABH'],['B544','BOSUT']],star:'BOSU2R',appr:'ILS16RY',via:'SOGER'},
  OERKOEAB1:{from:'OERK',to:'OEAB',altn:'OEJN',rwy:'15L',sid:'MERV2E',route:[['Z414','EMEKO'],['V40','ABH']],appr:'ILS13',via:'ABH'},
  OEABOERK1:{from:'OEAB',to:'OERK',altn:'OEMA',rwy:'13',sid:'RWYHDG',route:[['DCT','ABH'],['H75','IRBAB'],['Q313','MOBAG']],star:'MOBA1A',appr:'ILS15LY',via:'RK621',steps:[['ALMIN',33000]]},   /* OFP: FL170 to ALMIN, then FL330 */
  OEJNOEAH1:{from:'OEJN',to:'OEAH',altn:'OEMA',rwy:'16R',sid:'EGRE2F',route:[['T532','KSA'],['H976','MUSRI'],['L604','KFA'],['N687','DEMKA'],['DCT','HSA']],appr:'ILS34Y',via:'HSA'},
  OEAHOEJN1:{from:'OEAH',to:'OEJN',altn:'OEMA',rwy:'34',sid:'RWYHDG',route:[['DCT','HSA'],['DCT','DEMKA'],['N687','KFA'],['A776','OTISU'],['N112','GETOT'],['Q212','KSA'],['G782','VEMEM']],star:'VEME1A',appr:'ILS34L',via:'ITUXI'},
  OETBOEJN1:{from:'OETB',to:'OEJN',altn:'OEMA',rwy:'24',route:[['DCT','TBK'],['V54','WEJ'],['T510','RBG'],['B544','NOMDA']],star:'NOMD1A',appr:'ILS34L',via:'ITUXI'},
  OEJNOERK1:{from:'OEJN',to:'OERK',altn:'OEJN',rwy:'16R',sid:'EGRE2F',route:[['T532','ORDEM']],star:'ORDE1A',appr:'ILS15LY',via:'RK621'},
  OERKOEJN1:{from:'OERK',to:'OEJN',altn:'OEMA',rwy:'15L',sid:'UMAS1E',route:[['Y155','VEMEM']],star:'VEME1A',appr:'ILS34L',via:'ITUXI'}};
/* AOC answers to INIT REQUEST, by flight number (company route and INIT A data) */
const AOC_OFP={TRN385:{rte:'OEJNOETB1',ci:20,crz:340,temp:-46,tropo:36000},
  FAD385:{rte:'OEJNOETB1',ci:20,crz:340,temp:-45,tropo:36090},
  FAD386:{rte:'OETBOEJN1',ci:20,crz:330,temp:-41,tropo:36090},
  FAD122:{rte:'OEJNOERK1',ci:15,crz:350,temp:-47,tropo:36090},
  FAD139:{rte:'OERKOEJN1',ci:15,crz:340,temp:-45,tropo:36090},
  FAD225:{rte:'OERKOEMA1',ci:15,crz:340,temp:-44,tropo:36090},
  FAD226:{rte:'OEMAOERK1',ci:15,crz:350,temp:-47,tropo:36090},
  FAD309:{rte:'OEJNOEDF1',ci:15,crz:350,temp:-46,tropo:36090},
  FAD310:{rte:'OEDFOEJN1',ci:15,crz:240,temp:-20,tropo:36090},
  FAD341:{rte:'OEJNOEAB1',ci:15,crz:170,temp:-5,tropo:36090},
  FAD342:{rte:'OEABOEJN1',ci:15,crz:240,temp:-21,tropo:36090},
  FAD13:{rte:'OERKOEAB1',ci:15,crz:320,temp:-40,tropo:36090},
  FAD14:{rte:'OEABOERK1',ci:15,crz:170,temp:-8,tropo:36090},
  FAD429:{rte:'OEJNOEAH1',ci:15,crz:370,temp:-54,tropo:36090},
  FAD430:{rte:'OEAHOEJN1',ci:15,crz:380,temp:-57,tropo:36090}};

/* ---------- pilot data kept in this browser: stored waypoints and stored routes ---------- */
const STORE_KEY='airmanship.stored.v1';
let STORED={wpts:[],rtes:{}};
try{const t=localStorage.getItem(STORE_KEY);if(t)STORED=Object.assign(STORED,JSON.parse(t))}catch(e){}
STORED.wpts.forEach(w=>{DB.wpt[w.id]=w.pos});
function storeSave(){try{localStorage.setItem(STORE_KEY,JSON.stringify(STORED))}catch(e){}}
const allRtes=()=>Object.assign({},CO_RTES,STORED.rtes);

/* ---------- route string to F-PLN (strung without discontinuity, as a company route) ---------- */
function buildRoute(r){const p=newPlan(r.from,r.to),ap=DB.apt[r.from];
  if(r.rwy&&ap.rwy[r.rwy]){setRunway(p,r.rwy);if(r.sid&&((SIDS[r.from]||{})[r.rwy]||{})[r.sid])setSid(p,r.sid)}
  let fi=p.legs.findIndex(l=>l.k==='disc')-1;if(fi<0)fi=0;
  for(const[via,to]of r.route||[]){if(!fixReg(to))continue;(via&&AWY[via]||[]).forEach(fixReg);const from=p.legs[fi].id,aw=via&&via!=='DCT'&&AWY[via];
    fi=aw&&AWY[via].includes(from)&&AWY[via].includes(to)?insertAwy(p,fi,via,to):insertAwy(p,fi,null,to)}
  if(r.appr&&(APPRS[r.to]||{})[r.appr]){p.appr=r.appr;p.via=r.via||null;p.star=r.star&&(STARS[r.to]||{})[r.star]?r.star:null;buildArr(p)}
  const di=idxK(p,'dest');p.legs=p.legs.filter((l,i)=>!(l.k==='disc'&&i<di));normalize(p);
  /* step climbs printed on the OFP (an initial level, then the cruise level from a waypoint): S/C on the F-PLN */
  (r.steps||[]).forEach(([id,alt])=>{const l=p.legs.find(l=>l.k==='wpt'&&l.seg==='enr'&&l.id===id);if(l)l.step=alt});return p}
/* active F-PLN to a route (runway, SID, airways and waypoints, approach) for STORED ROUTES */
function routeOf(p){const r={from:p.legs[0].id,to:p.legs[idxK(p,'dest')].id,altn:I().altn||null,rwy:p.rwy||null,sid:p.sid||null,appr:p.appr||null,via:p.via||null,star:p.star||null,route:[]};
  for(const l of p.legs){if(l.k!=='wpt'||l.seg!=='enr')continue;const v=l.via||'DCT',last=r.route[r.route.length-1];if(last&&last[0]===v&&v!=='DCT')last[1]=l.id;else r.route.push([v,l.id])}
  return r}
function applyRoute(name,r){const i=I();i.from=r.from;i.to=r.to;if(r.altn&&DB.apt[r.altn]){i.altn=r.altn;i.altnRwy=null;i.altR=null;altRouteOfp(r)}S.active=buildRoute(r);S.tmpy=null;S.fpOff=0;S.coRte=name}
/* the route to the alternate printed on the OFP of this city pair becomes the ALTN F-PLN */
function altRouteOfp(r){const o=typeof ofpFor==='function'&&ofpFor(r.from,r.to),a=o&&o.altn.find(x=>x.id===r.altn);if(!a)return;const R=altRte();
  a.log.slice(0,-1).forEach(x=>{if(fixReg(x.id)){R.wpts.push(x.id);R.via[x.id]=/^[A-Z]\d+$/.test(x.awy)?x.awy:''}});R.dct=true}
const routeLines=r=>{const out=[];if(r.sid)out.push([r.sid,r.route.length?'':'']);r.route.forEach(([v,t])=>out.push([v,t]));if(r.star)out.push([r.star,'']);if(r.appr)out.push([r.appr,r.via?'VIA '+r.via:'']);if(r.altn)out.push(['ALTN',r.altn]);return out};

/* ---------- INIT A: CO RTE, ROUTE selection after FROM/TO, INIT REQUEST ---------- */
{const r0=P.INIT.render;P.INIT.render=function(){r0.call(this);const i=I();
   if(S.coRte){for(let c=0;c<12;c++)BUF[2][c]={ch:' ',c:'w',s:'L'};put(3,0,S.coRte,'b')}
   for(let c=12;c<COLS;c++)BUF[4][c]={ch:' ',c:'w',s:'L'};
   if(S.req)rput(5,'REQUEST ','w');else rput(5,'REQUEST*','a')}
 const l0=P.INIT.lsk;P.INIT.lsk=function(s,n){const k=s+n,v=S.sp;
  if(k==='L1'){if(!v)return;if(flying())return err('NOT ALLOWED');if(v==='CLR'){S.coRte=null;return ok()}const r=allRtes()[v];if(!r)return err('NOT IN DATA BASE');applyRoute(v,r);return ok()}
  if(k==='R2'){if(flying())return err('NOT ALLOWED');if(S.req)return;const id=I().flt;const known=id&&AOC_OFP[id];
    const pair=I().from&&Object.keys(allRtes()).find(x=>allRtes()[x].from===I().from&&allRtes()[x].to===I().to);
    if(!known&&!pair)return err('NO ANSWER TO REQUEST');S.req=true;
    setTimeout(()=>{S.req=false;const o=known?AOC_OFP[id]:{rte:pair};const r=allRtes()[o.rte];if(!r){err('NO ANSWER TO REQUEST');return render()}
      applyRoute(o.rte,r);const i=I();if(o.ci!=null)i.ci=o.ci;if(o.crz){i.crz=o.crz;i.temp=o.temp??null}if(o.tropo)i.tropo=o.tropo;msg2('AOC ACT F-PLN UPLINK');render()},REQ_MS);return}
  const from0=I().from+'/'+I().to;l0.call(this,s,n);
  if(k==='R1'&&I().from&&I().from+'/'+I().to!==from0){S.coRte=null;const list=Object.keys(allRtes()).filter(x=>allRtes()[x].from===I().from&&allRtes()[x].to===I().to);
    if(list.length){S.rsel={list,i:0,off:0,ro:0};go('ROUTELIST')}}}}
let REQ_MS=2000;   /* AOC answer delay */
/* CO RTES: the company routes of the city pair by name; a line key opens the route, where INSERT puts it in the F-PLN */
P.ROUTELIST={render(){const L=S.rsel.list,r0=allRtes()[L[0]];
  cput(1,'CO RTES');put(2,1,'FROM/TO','w','S');put(3,0,r0.from+'/'+r0.to,'g');rput(3,L.length+(L.length>1?' ROUTES':' ROUTE'),'w','S');
  for(let n=0;n<4;n++){const name=L[S.rsel.off+n];if(!name)break;put(5+2*n,0,'<'+name,'b')}
  if(L.length>4)rput(12,'↑↓','w','S');put(13,0,'<RETURN')},
 lsk(s,n){if(s+n==='L6')return go('INIT');if(s==='L'&&n>=2&&n<=5){const j=S.rsel.off+n-2;if(!S.rsel.list[j])return;S.rsel.i=j;S.rsel.ro=0;return go('ROUTESEL')}return err('NOT ALLOWED')},
 slew(d){const n=S.rsel.list.length;S.rsel.off=Math.max(0,Math.min(Math.max(0,n-1),S.rsel.off+d))}};
P.ROUTESEL={render(){const L=S.rsel.list,name=L[S.rsel.i],r=allRtes()[name],R=routeLines(r),o=S.rsel.ro||0;
  put(1,5,'ROUTE');put(1,12,(S.rsel.i+1)+'/'+L.length,'w','S');if(L.length>1)put(1,22,'←→','w','S');
  put(2,1,'CO RTE','w','S');rput(2,'FROM/TO  ','w','S');put(3,0,name,'b');rput(3,r.from+'/'+r.to,'b');
  R.slice(o,o+8).forEach(([a,b],j)=>{put(4+j,1,a,'g');if(b)put(4+j,10,b,'g')});if(R.length>8)rput(12,'↑↓','w','S');
  put(13,0,'<RETURN');rput(13,'INSERT*','a')},
 arrow(d){const n=S.rsel.list.length;S.rsel.i=(S.rsel.i+(d>0?1:-1)+n)%n;S.rsel.ro=0},
 slew(d){const n=routeLines(allRtes()[S.rsel.list[S.rsel.i]]).length;S.rsel.ro=Math.max(0,Math.min(Math.max(0,n-8),(S.rsel.ro||0)+d))},
 lsk(s,n){if(s+n==='L6')return go('ROUTELIST');if(s+n==='R6'){const name=S.rsel.list[S.rsel.i];applyRoute(name,allRtes()[name]);return go('INIT')}return err('NOT ALLOWED')}};

/* LAT REV on a fix of the ALTN F-PLN (the destination or a waypoint): the same keys as on the F-PLN: NEXT WPT (3R) and AIRWAYS (5R) */
P.ALTLR={render(){const id=P.ALTAWY.from(),pos=S.aaw.i<0?legPos(S.active.legs[idxK(S.active,'dest')]):DB.wpt[id];
  csegs(1,[['LAT REV','w'],[' FROM ','w','S'],[id,'b']]);if(pos)cput(2,fmtLL(pos),'b','S');
  rput(6,'NEXT WPT ','w','S');rput(7,'[    ]','b');rput(11,'AIRWAYS>');put(13,0,'<RETURN')},
 lsk(s,n){const k=s+n,v=S.sp;if(k==='L6')return go('FPLN');if(k==='R5'){S.aaw.rows=[];return go('ALTAWY')}
  if(k==='R3'){if(!v)return;if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');if(!fixReg(v))return err('NOT IN DATA BASE');if(v===P.ALTAWY.from())return err('NOT ALLOWED');
    P.ALTAWY.ins([v],'');S.sp='';return go('FPLN')}
  return err('NOT ALLOWED')}};
/* ALTN AIRWAYS: the route to the alternate by airway (VIA) and waypoint (TO), from the fix chosen on the ALTN F-PLN.
   It goes straight into the ALTN F-PLN (shown in blue): there is no temporary F-PLN for the alternate. */
P.ALTAWY={from(){const a=S.aaw,R=altRte();return a.i<0?destId():R.wpts[a.i]},
 render(){const a=S.aaw;csegs(1,[['ALTN AIRWAYS','w'],[' FROM ','w','S'],[a.rows.length?a.rows[0].fromId:this.from(),'b']]);
  put(2,1,'VIA','w','S');rput(2,'TO','w','S',22);const R=a.rows;
  for(let r=0;r<5;r++){const ln=3+2*r;
    if(r<R.length){put(ln,1,R[r].via,'b');if(R[r].to)rput(ln,R[r].to,'b','L',23);else rput(ln,'[     ]','b')}
    else{put(ln,0,'[    ]','b');if(!R.length||R[R.length-1].to)rput(ln,'[     ]','b');break}}
  put(13,0,'<RETURN')},
 ins(seq,via){const a=S.aaw,R=altRte();seq.forEach(id=>{fixReg(id);const k=R.wpts.indexOf(id);if(k>a.i){R.wpts.splice(a.i+1,k-a.i);}   /* joins a fix already ahead in the route */
    R.wpts.splice(a.i+1,0,id);R.via[id]=via||'';a.i++});R.dct=true},
 lsk(s,n){const a=S.aaw,k=s+n,R=a.rows,v=S.sp;if(k==='L6')return go('FPLN');if(!v||n>5)return;
  const last=R[R.length-1],pend=last&&!last.to,fromId=this.from();
  if(s==='L'){if(n-1!==R.length||pend)return err('NOT ALLOWED');if(!AWY[v])return err('NOT IN DATA BASE');if(!AWY[v].includes(fromId))return err('AWY/WPT MISMATCH');R.push({via:v,to:null,fromId});return ok()}
  if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');if(!fixReg(v))return err('NOT IN DATA BASE');if(v===fromId)return err('NOT ALLOWED');
  if(pend&&n-1===R.length-1){const L=AWY[last.via];if(!L.includes(v))return err('AWY/WPT MISMATCH');const i=L.indexOf(fromId),j=L.indexOf(v);
    this.ins(i<j?L.slice(i+1,j+1):L.slice(j,i).reverse(),last.via);last.to=v;return ok()}
  if(!pend&&n-1===R.length){this.ins([v],'');R.push({via:'DCT',to:v,fromId});return ok()}
  return err('NOT ALLOWED')}};

/* ---------- pilot waypoints: LAT/LONG, PLACE/BRG/DIST, PLACE-BRG/PLACE-BRG ---------- */
function parseLL(v){let m=v.match(/^([NS])(\d{2})(\d{2}(?:\.\d)?)\/([EW])(\d{3})(\d{2}(?:\.\d)?)$/);if(m)return[(m[1]==='S'?-1:1)*(+m[2]+m[3]/60),(m[4]==='W'?-1:1)*(+m[5]+m[6]/60)];
  m=v.match(/^(\d{2})(\d{2}(?:\.\d)?)([NS])\/(\d{3})(\d{2}(?:\.\d)?)([EW])$/);if(m)return[(m[3]==='S'?-1:1)*(+m[1]+m[2]/60),(m[6]==='W'?-1:1)*(+m[4]+m[5]/60)];return null}
const magVarAt=pos=>{let best=null;for(const a of Object.values(DB.apt)){const d=gc(pos,a.pos);if(!best||d<best.d)best={d,v:a.var||0}}return best?best.v:0};
function parsePBD(v){const m=v.match(/^([A-Z0-9]{2,5})\/(\d{1,3})\/(\d{1,3}(?:\.\d)?)$/);if(!m)return null;const P=anyPos(m[1]);if(!P)return'DB';if(+m[2]>360||+m[3]>999)return'R';
  return{pos:dst(P,+m[2]+magVarAt(P),+m[3]),place:m[1],brg:+m[2],dist:+m[3]}}
function parsePBX(v){const m=v.match(/^([A-Z0-9]{2,5})-(\d{1,3})\/([A-Z0-9]{2,5})-(\d{1,3})$/);if(!m)return null;const A=anyPos(m[1]),B=anyPos(m[3]);if(!A||!B)return'DB';
  /* intersection of the two radials (flat projection around the first place) */
  const ta=(+m[2]+magVarAt(A))*D2R,tb=(+m[4]+magVarAt(B))*D2R,b=enu(A,B),da=[Math.sin(ta),Math.cos(ta)],db=[Math.sin(tb),Math.cos(tb)],den=da[0]*db[1]-da[1]*db[0];if(Math.abs(den)<1e-6)return'R';
  const t=(b[0]*db[1]-b[1]*db[0])/den,X=[da[0]*t,da[1]*t];if(t<=0||(X[0]-b[0])*db[0]+(X[1]-b[1])*db[1]<=0)return'R';   /* ahead on both radials */return{pos:[A[0]+da[1]*t/60,A[1]+da[0]*t/(60*Math.cos(A[0]*D2R))],p1:m[1],b1:+m[2],p2:m[3],b2:+m[4]}}
function nextPilotId(pre){for(let n=1;n<100;n++){const id=pre+String(n).padStart(2,'0');if(!DB.wpt[id])return id}return null}
function storeWpt(id,pos,type,src){STORED.wpts=STORED.wpts.filter(w=>w.id!==id);STORED.wpts.push({id,pos,type,src});DB.wpt[id]=pos;storeSave();return id}
/* an LL, PBD or PBX entry in the F-PLN, LAT REV or DIR TO creates a pilot waypoint (LL01, PBD01, PBX01...); returns its ident, or an error */
function pilotWpt(v){const ll=parseLL(v);if(ll)return storeWpt(nextPilotId('LL'),ll,'LL',v);
  const pb=parsePBD(v);if(pb==='DB')return{e:'NOT IN DATA BASE'};if(pb==='R')return{e:'ENTRY OUT OF RANGE'};if(pb)return storeWpt(nextPilotId('PBD'),pb.pos,'PBD',pb);
  const px=parsePBX(v);if(px==='DB')return{e:'NOT IN DATA BASE'};if(px==='R')return{e:'ENTRY OUT OF RANGE'};if(px)return storeWpt(nextPilotId('PBX'),px.pos,'PBX',px);return null}
function withPilot(fn,cond){return function(s,n){const v=S.sp;if(v&&v!=='CLR'&&cond(s,n)){const r=pilotWpt(v);if(r&&r.e)return err(r.e);if(typeof r==='string')S.sp=r}return fn.call(this,s,n)}}
P.FPLN.lsk=withPilot(P.FPLN.lsk,(s,n)=>s==='L'&&n<6);
P.LATREV.lsk=withPilot(P.LATREV.lsk,(s,n)=>s+n==='R3');
P.DIR.lsk=withPilot(P.DIR.lsk,(s,n)=>s+n==='L1');

/* ---------- DATA 2/2: STORED WAYPOINTS, NEW WAYPOINT, STORED ROUTES ---------- */
{const l0=P.DATA.lsk;P.DATA.lsk=function(s,n){const k=s+n;if(S.dataPg===2){if(k==='R1'){S.swi=0;S.delAll=false;return go(STORED.wpts.length?'STOREDWPT':'NEWWPT')}
  if(k==='R4'){S.sri=0;return go('STOREDRTE')}}return l0.call(this,s,n)}}
const fmtLLs=p=>fmtLL(p).replace(/°/g,'');
P.STOREDWPT={render(){const W=STORED.wpts;if(!W.length){S.page='NEWWPT';return P.NEWWPT.render()}S.swi=Math.min(S.swi||0,W.length-1);const w=W[S.swi];
  put(1,3,'STORED WAYPOINT');put(1,19,(S.swi+1)+'/99','w','S');put(2,1,'IDENT','w','S');put(3,0,w.id,'g');put(4,4,'LAT/LONG','w','S');
  if(w.type==='PBD'){put(5,0,fmtLL(w.pos),'g','S');put(6,0,'PLACE  /BRG /DIST','w','S');put(7,0,w.src.place.padEnd(7)+'/'+String(w.src.brg).padStart(3,'0')+'°/'+(+w.src.dist).toFixed(1),'g')}
  else if(w.type==='PBX'){put(5,0,fmtLL(w.pos),'g','S');put(8,0,'PLACE-BRG  /PLACE-BRG','w','S');put(9,0,w.src.p1.padStart(5)+'-'+String(w.src.b1).padStart(3,'0')+'° /'+w.src.p2.padStart(5)+'-'+String(w.src.b2).padStart(3,'0')+'°','g')}
  else put(5,0,fmtLL(w.pos),'g');
  rput(10,'NEW ','w','S');rput(11,'WAYPOINT>');if(S.delAll){rput(12,'CONFIRM ','a','S');rput(13,'DELETE ALL*','a')}else rput(13,'DELETE ALL→','b')},
 arrow(d){const n=STORED.wpts.length;if(n)S.swi=((S.swi||0)+(d>0?1:-1)+n)%n},slew(d){this.arrow(d)},
 lsk(s,n){const k=s+n,v=S.sp;
  if(k==='L1'&&v==='CLR'){const w=STORED.wpts[S.swi];if(!w)return;if(S.active&&S.active.legs.some(l=>l.id===w.id))return err('NOT ALLOWED');STORED.wpts.splice(S.swi,1);delete DB.wpt[w.id];storeSave();ok();if(!STORED.wpts.length)go('DATA');return}
  if(k==='R5'){S.nw={};return go('NEWWPT')}
  if(k==='R6'){if(!S.delAll){S.delAll=true;return}const used=new Set(S.active?S.active.legs.map(l=>l.id):[]);STORED.wpts=STORED.wpts.filter(w=>{if(used.has(w.id))return true;delete DB.wpt[w.id];return false});storeSave();S.delAll=false;S.swi=0;return go(STORED.wpts.length?'STOREDWPT':'DATA')}
  return err('NOT ALLOWED')}};
P.NEWWPT={render(){const w=S.nw||(S.nw={});cput(1,'NEW WAYPOINT');put(2,0,'IDENT','w','S');put(3,0,w.id||'_______',w.id?'b':'a');
  put(4,0,'LAT/LONG','w','S');put(6,0,'PLACE/BRG /DIST','w','S');put(8,0,'PLACE-BRG  /PLACE-BRG','w','S');
  if(w.type==='LL')put(5,0,fmtLL(w.pos),'b');else put(5,0,'____.__/_____.__','a');
  if(w.type==='PBD')put(7,0,w.src.place.padEnd(7)+'/'+String(w.src.brg).padStart(3,'0')+'°/'+(+w.src.dist).toFixed(1),'b');else put(7,0,'_______/___°/___._','a');
  if(w.type==='PBX')put(9,0,w.src.p1+'-'+String(w.src.b1).padStart(3,'0')+'°/'+w.src.p2+'-'+String(w.src.b2).padStart(3,'0')+'°','b');else put(9,0,'_____-___°/_____-___°','a');
  rput(11,'RETURN>');if(w.type)rput(13,'STORE→','a')},
 lsk(s,n){const k=s+n,v=S.sp,w=S.nw||(S.nw={});
  if(k==='R5')return go(STORED.wpts.length?'STOREDWPT':'DATA');
  if(k==='R6'){if(!w.type)return err('NOT ALLOWED');const id=w.id||nextPilotId(w.type);storeWpt(id,w.pos,w.type,w.src);S.nw={};S.swi=STORED.wpts.length-1;return go('STOREDWPT')}
  if(!v)return;
  if(k==='L1'){if(!/^[A-Z0-9]{1,7}$/.test(v))return err('FORMAT ERROR');if(DB.wpt[v]||DB.apt[v]||(DB.nav&&DB.nav[v]))return err('NOT ALLOWED');w.id=v;return ok()}
  if(k==='L2'){const ll=parseLL(v);if(!ll)return err('FORMAT ERROR');Object.assign(w,{type:'LL',pos:ll,src:v});return ok()}
  if(k==='L3'){const pb=parsePBD(v);if(!pb)return err('FORMAT ERROR');if(pb==='DB')return err('NOT IN DATA BASE');if(pb==='R')return err('ENTRY OUT OF RANGE');Object.assign(w,{type:'PBD',pos:pb.pos,src:pb});return ok()}
  if(k==='L4'){const px=parsePBX(v);if(!px)return err('FORMAT ERROR');if(px==='DB')return err('NOT IN DATA BASE');if(px==='R')return err('ENTRY OUT OF RANGE');Object.assign(w,{type:'PBX',pos:px.pos,src:px});return ok()}
  return err('NOT ALLOWED')}};
P.STOREDRTE={render(){const names=Object.keys(STORED.rtes);cput(1,'STORED ROUTES');
  if(names.length){S.sri=Math.min(S.sri||0,names.length-1);const name=names[S.sri],r=STORED.rtes[name];rput(1,(S.sri+1)+'/'+names.length,'w','S');
    put(2,1,'CO RTE','w','S');rput(2,'FROM/TO  ','w','S');put(3,0,name,'g');rput(3,r.from+'/'+r.to,'g');routeLines(r).slice(0,5).forEach(([a,b],j)=>{put(4+j,1,a,'g','S');if(b)put(4+j,10,b,'g','S')});
    rput(12,'DELETE ','w','S');rput(13,'ROUTE*','b')}
  else cput(5,'NO STORED ROUTE','w','S');
  put(10,1,'STORE ACTIVE F-PLN AS','w','S');put(11,0,'[        ]','b');put(13,0,'<RETURN')},
 arrow(d){const n=Object.keys(STORED.rtes).length;if(n)S.sri=((S.sri||0)+(d>0?1:-1)+n)%n},slew(d){this.arrow(d)},
 lsk(s,n){const k=s+n,v=S.sp;if(k==='L6')return go('DATA');
  if(k==='R6'){const names=Object.keys(STORED.rtes);if(!names.length)return err('NOT ALLOWED');delete STORED.rtes[names[S.sri]];storeSave();S.sri=0;return}
  if(k==='L5'){if(!v)return;if(!/^[A-Z0-9]{1,10}$/.test(v))return err('FORMAT ERROR');if(!S.active||idxK(S.active,'dest')<1)return err('NOT ALLOWED');if(CO_RTES[v])return err('NOT ALLOWED');
    STORED.rtes[v]=routeOf(S.active);storeSave();S.sri=Object.keys(STORED.rtes).indexOf(v);return ok()}
  return err('NOT ALLOWED')}};

/* ---------- MCDU MENU (FlyByWire CDUMenuPage): FMGC active in green; the other systems are not simulated ---------- */
const FM_PAGES_SKIP=['MENU','ATSU','AIDS','CFDS'];
P.MENU={render(){put(1,7,'MCDU MENU');rput(2,'SELECT ','i','S');put(3,0,'<FMGC','g');rput(3,'NAV B/UP>','i');put(5,0,'<ATSU');put(7,0,'<AIDS');put(9,0,'<CFDS');rput(13,'RETURN>')},
 lsk(s,n){const k=s+n;if(k==='L1'||k==='R6')return go(S.fmPage||'INIT');if(k==='L2')return go('ATSU');if(k==='L3')return go('AIDS');if(k==='L4')return go('CFDS');return err('NOT ALLOWED')}};
P.ATSU={render(){cput(1,'ATSU DATALINK');put(3,0,'<ATC MENU');rput(3,'AOC MENU>');put(12,1,'DATALINK','w','S');put(13,0,'<STATUS');rput(13,'RETURN>')},
 lsk(s,n){if(s+n==='R6')return go('MENU');return err('NOT IN PROTOTYPE')}};
P.AIDS={render(){cput(1,'AIDS MAIN MENU');put(3,0,'<PARAM ALPHA CALL-UP');put(5,0,'<PARAM LABEL CALL-UP');put(7,0,'<PROGRAMMING');put(9,0,'<SAR');rput(13,'RETURN>')},
 lsk(s,n){if(s+n==='R6')return go('MENU');return err('NOT IN PROTOTYPE')}};
P.CFDS={render(){cput(1,'CFDS');cput(2,'MENU','w','S');put(3,0,'<LAST LEG REPORT');put(5,0,'<LAST LEG ECAM REPORT');put(7,0,'<PREVIOUS LEGS REPORT');put(9,0,'<AVIONICS STATUS');put(11,0,'<SYSTEM REPORT / TEST');rput(13,'RETURN>')},
 lsk(s,n){if(s+n==='R6')return go('MENU');return err('NOT IN PROTOTYPE')}};
/* the MCDU MENU key remembers the FMGC page to return to */
{const p0=press;press=function(k){if(k==='MENU'&&!FM_PAGES_SKIP.includes(S.page))S.fmPage=S.page;return p0(k)};window.__press=press}
window.__stored=()=>STORED;window.__reqMs=v=>{REQ_MS=v};

/* ARRIVAL and DEPARTURES: the ← → keys change the list (FlyByWire / A320 MCDU): ARRIVAL approaches ⇄ STARs (VIAs with
   the VIA key), DEPARTURES runways ⇄ SIDs (and the transitions after a SID). A new choice goes into the TMPY F-PLN. */
P.ARR.arrow=function(d){const o=S.arrAlt?['APPR']:['APPR','STAR'],i=Math.max(0,o.indexOf(S.arr.list==='VIA'?'APPR':S.arr.list));S.arr={list:o[(i+d+o.length)%o.length],off:0}};
P.DEP.arrow=function(d){const p=cur(),o=p&&p.rwy?(p.sid?['RWY','SID','TRANS']:['RWY','SID']):['RWY'],i=Math.max(0,o.indexOf(S.dep.list));S.dep={list:o[(i+d+o.length)%o.length],off:0}};
