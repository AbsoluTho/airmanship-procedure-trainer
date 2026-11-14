'use strict';
/* ================= MCDU / FMGC, part 3 =================
   NEW DEST, HOLD (HOLD AT page, flown as a racetrack with IMM EXIT and RESUME HOLD), OFFSET,
   FIX INFO (radials and radius drawn on the ND) and the system messages in the scratchpad.
   Page layouts follow the FlyByWire A32NX MCDU (GPL-3.0, https://github.com/flybywiresim/aircraft):
   A320_Neo_CDU_LateralRevisionPage, A320_Neo_CDU_HoldAtPage, A320_Neo_CDU_FixInfoPage and the
   hold line of A320_Neo_CDU_FlightPlanPage. Simplified for procedure training. */

{const base=freshState;freshState=function(){return Object.assign(base(),{hold:null,fix:[null,null,null,null],fixPg:1,msgOff:{}})}}
Object.assign(S,{hold:null,fix:[null,null,null,null],fixPg:1,msgOff:{}});

/* ---------- hold geometry and speed ---------- */
const HOLD_R=1.1;                                   /* turn radius (NM): 180° in one minute at about 210 kt */
const holdLen=l=>l.dist!=null?l.dist:180*(l.time??1)/60;   /* leg length (NM); time converted at 180 kt, as the FlyByWire HOLD page */
/* racetrack from the fix: turn to the outbound leg, outbound, turn, inbound back to the fix (crsT true inbound course) */
function holdLoop(F,crsT,right,L,r){const t=crsT*D2R,u=[Math.sin(t),Math.cos(t)],sg=right?1:-1,v=[Math.cos(t)*sg,-Math.sin(t)*sg];
  const P=(x,y)=>[F[0]+y/60,F[1]+x/(60*Math.cos(F[0]*D2R))],out=[P(0,0)];
  for(let i=1;i<=12;i++){const a=Math.PI*i/12;out.push(P(r*v[0]+r*(-Math.cos(a)*v[0]+Math.sin(a)*u[0]),r*v[1]+r*(-Math.cos(a)*v[1]+Math.sin(a)*u[1])))}
  for(let i=0;i<=12;i++){const a=Math.PI*i/12,cx=r*v[0]-L*u[0],cy=r*v[1]-L*u[1];out.push(P(cx+r*(Math.cos(a)*v[0]-Math.sin(a)*u[0]),cy+r*(Math.cos(a)*v[1]-Math.sin(a)*u[1])))}
  out.push(P(0,0));return out}
/* hold speed: about green dot, not above 230 kt up to 14000 ft (240 kt above) */
function holdSpd(){const gw=flying()?gwNowF():gwNow();const o=gw?charSpeeds(gw).O:210,alt=flying()?FL.alt:elevO();return Math.round(Math.min(alt<=14000?230:240,Math.max(170,o)))}
/* database holds: the holds of the published missed approaches (fix, inbound course, turn) */
let _holds=null;
function HOLDS(){if(_holds)return _holds;_holds={};for(const t of Object.values(APPRS||{}))for(const ap of Object.values(t||{})){const m=ap&&ap.missed||[];
  m.forEach((l,i)=>{if(l.k==='hold'&&i>0&&m[i-1].k==='wpt'){const c=String(l.lbl||'').match(/(\d{3})/);if(c)_holds[m[i-1].id]={crs:+c[1],turn:/L$/.test(l.id)?'L':'R'}}})}
  return _holds}
const magVarOf=p=>DB.apt[p.legs[0].id].var||0;
function holdDefault(p,ix){const f=p.legs[ix],F=legPos(f),db=HOLDS()[f.id];let prev=null;
  for(let j=ix-1;j>=0;j--){const q=p.legs[j];if(q.k==='disc')break;const pp=legPos(q);if(pp){prev=pp;break}}
  const inb=prev&&F?Math.round((brg(prev,F)-magVarOf(p)+360)%360)||360:100;
  const alt=f.alt?f.alt.v:(flying()?FL.alt:elevO()),time=alt<=14000?1:1.5;
  return db?{crs:db.crs,turn:db.turn,time,dist:null,type:'DATABASE'}:{crs:inb,turn:'R',time,dist:null,type:'COMPUTED'}}
function holdName(l){l.id='HOLD '+l.turn;l.lbl='C'+String(l.crs).padStart(3,'0')+'°'}
function makeHold(fix,d,seg){const l={k:'hold',fix:fix.id,crs:d.crs,turn:d.turn,time:d.time,dist:d.dist,type:d.type,def:Object.assign({},d),seg:seg||fix.seg||'enr'};holdName(l);return l}

/* ---------- offset: the route shifted left or right from the entry point to the start of the approach, joined and left at 45° ---------- */
function offsetPts(pts,p){const o=p.ofst;if(!o||pts.length<2)return;let s=0;pts.forEach((q,i)=>{if(i)s+=gc(pts[i-1].p,q.p);q.s=s});
  const Pt={pts};let s0=o.pos0?((project(Pt,o.pos0,1,pts.length-1)||{s:0}).s):0;
  const ie=pts.findIndex(q=>q.ix!=null&&(p.legs[q.ix].seg==='arr'||p.legs[q.ix].k==='dest'));let sE=ie>0?pts[ie].s:pts[pts.length-1].s;
  const R=Math.min(o.nm,(sE-s0)/2);if(R<=0.5)return;
  /* vertices at the start and end of the joining legs */
  const ins=x=>{const i=pts.findIndex(q=>q.s>=x);if(i<=0)return null;if(Math.abs(pts[i].s-x)<0.05)return pts[i];const A=pts[i-1],B=pts[i],f=(x-A.s)/((B.s-A.s)||1);
    const q={p:[A.p[0]+(B.p[0]-A.p[0])*f,A.p[1]+(B.p[1]-A.p[1])*f],ix:null,s:x};pts.splice(i,0,q);return q};
  const a=ins(s0),b=ins(s0+R),c=ins(sE-R),d=ins(sE);if(a)a.os=true;if(d)d.oe=true;
  const sign=o.side==='L'?-1:1,orig=pts.map(q=>q.p.slice());
  pts.forEach((q,i)=>{if(q.s<=s0||q.s>=sE)return;const f=Math.min(1,(q.s-s0)/R,(sE-q.s)/R);
    const A=orig[Math.max(0,i-1)],B=orig[Math.min(pts.length-1,i+1)];q.p=dst(orig[i],brg(A,B)+90*sign,o.nm*f)})}

/* ---------- system messages (type II) ---------- */
function msgCond(t,amber,cond){let c=false;try{c=!!cond()}catch(e){c=false}
  if(c){if(!S.msgOff[t])msg2(t,amber,()=>{try{return!cond()}catch(e){return true}})}else S.msgOff[t]=false}
function destEfob(){const pr=predict();if(!pr)return null;if(flying()&&FL.path)return{efob:FL.fob-pr.trip.fuel*Math.max(0,FL.path.sThr-FL.s)/FL.path.sThr,min:pr.minFob};
  return{efob:S.fuel.block-pr.taxi-pr.trip.fuel,min:pr.minFob}}
function msgTick(){if(!S.msgOff)S.msgOff={};
  /* INIT A shows the destination of the active F-PLN (after NEW DEST or ENABLE ALTN) */
  if(S.active){const d=S.active.legs[idxK(S.active,'dest')];if(d&&d.id!==I().to)I().to=d.id}
  msgCond('ENTER DEST DATA',true,()=>flying()&&!FL.ground&&FL.path&&FL.path.sThr-FL.s<180&&(S.p2.qnh==null||S.p2.temp==null||S.p2.wdir==null));
  msgCond('DEST EFOB BELOW MIN',true,()=>{const e=destEfob();return!!(e&&e.efob<e.min-0.05)});
  msgCond('SET HOLD SPEED',false,()=>flying()&&FL.hsActive!=null&&!FCU.spdMgd&&FCU.spd!=null)}

/* ---------- NEW DEST: the route after the revised waypoint is deleted, a discontinuity, then the new destination (FlyByWire newDest) ---------- */
function newDest(p,ix,apt){const l=p.legs[ix];let keep=ix+1;
  if(l.k==='orig'){while(keep<p.legs.length&&p.legs[keep].seg==='dep')keep++}
  p.legs=p.legs.slice(0,keep);p.legs.push({k:'disc'},{k:'dest',id:apt,rwy:null});p.appr=null;p.via=null;p.star=null;
  if(p.ofst)delete p.ofst;normalize(p)}

/* ---------- LAT REV (FlyByWire layout) ---------- */
const lrLeg=()=>S.lr===-1?{k:'altn',id:I().altn,rwy:I().altnRwy}:cur().legs[S.lr];
const isFromLeg=()=>flying()&&!FL.ground&&!S.secMode&&S.lr===FL.fromIx;
const fixInfoOk=l=>!S.secMode&&(l.k==='orig'&&!flying()||isFromLeg());
const offsetOk=l=>isFromLeg()&&(l.k==='wpt'||l.k==='tp'||l.k==='ca'||l.k==='orig');
P.LATREV={render(){const p=cur(),l=lrLeg(),isW=l.k==='wpt',isO=l.k==='orig',isD=l.k==='dest',isA=l.k==='altn',ppos=l.k==='tp'||l.k==='ca';
  csegs(1,[[S.secMode?'SEC LAT REV':'LAT REV','w'],[' FROM ','w','S'],[isD&&l.rwy?l.id+l.rwy:(ppos&&l.k==='tp'?'PPOS':l.id),'g']]);
  const pos=legPos(l);if(pos)cput(2,fmtLL(pos),'g','S');
  if(isO&&!flying())put(3,0,'<DEPARTURE');
  if(isD||isA||isAptWpt(l))rput(3,'ARRIVAL>');else if(fixInfoOk(l))rput(3,'FIX INFO>');
  if(!isD&&!isA){rput(4,'LL XING/INCR/NO','w','S',23);rput(5,'[  ]°/[ ]°/[]','b')}
  if(offsetOk(l)){const o=p.ofst;put(4,1,'OFFSET','w','S');put(5,0,o?o.side+o.nm:'[  ]',o&&S.tmpy?'y':'b')}
  if((isO&&!flying())||isW||isD){rput(6,'NEXT WPT ','w','S');rput(7,'[    ]','b')}
  if(isW)put(7,0,'<HOLD');
  if(isD){put(6,1,'ALTN','w','S');put(7,0,I().altn?'<'+I().altn:'[    ]','b')}
  if(isW&&I().altn&&!S.secMode){put(8,1,'ENABLE','b','S');put(9,0,'{ALTN','b')}
  if(!isD&&!isA&&(!ppos||l.k==='tp')){rput(8,'NEW DEST ','w','S');rput(9,'[  ]','b')}
  if(isW)rput(11,'AIRWAYS>');
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),l=lrLeg(),k=s+n,v=S.sp;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  if(k==='L1'&&l.k==='orig'&&!flying()){S.dep={list:p.rwy?'SID':'RWY',off:0};return go('DEP')}
  if(k==='R1'&&l.k==='altn'){S.arrAlt=true;S.arr={list:'APPR',off:0};return go('ARR')}
  if(k==='R1'&&l.k==='dest'){S.arrAlt=false;const hasA=(APPRS[l.id]||{})[p.appr];S.arr={list:p.appr&&hasA?'VIA':'APPR',off:0};return go('ARR')}
  if(k==='R1'&&isAptWpt(l)){const q=edit();q.legs=q.legs.slice(0,S.lr);q.legs.push({k:'dest',id:l.id,rwy:null});q.appr=null;q.via=null;q.star=null;
    if(q.ofst)delete q.ofst;normalize(q);S.lr=idxK(q,'dest');S.arrAlt=false;S.arr={list:'APPR',off:0};S.fpOff=0;return go('ARR')}   /* the airport becomes the destination */
  if(k==='R1'&&fixInfoOk(l)){S.fixPg=1;return go('FIXINFO')}
  if(k==='L2'&&offsetOk(l)){if(!v)return;const q=edit();
    if(v==='CLR'){if(!q.ofst)return err('NOT ALLOWED');delete q.ofst;return ok()}
    const m=v.match(/^([LR])(\d{1,2})$/)||v.match(/^(\d{1,2})([LR])$/);if(!m)return err('FORMAT ERROR');
    const side=/[LR]/.test(m[1])?m[1]:m[2],nm=+(/[LR]/.test(m[1])?m[2]:m[1]);if(nm<1||nm>50)return err('ENTRY OUT OF RANGE');
    q.ofst={side,nm,pos0:FL.pos.slice(),ix0:FL.fromIx};return ok()}
  if(k==='L3'&&l.k==='wpt'){const nx=p.legs[S.lr+1];if(nx&&nx.k==='hold'){S.hold=S.lr+1;return go('HOLD')}
    const q=edit(),fx=q.legs[S.lr];   /* hold, then its fix repeated and a discontinuity: the exit can be joined to a new route or a NEW DEST */
    q.legs.splice(S.lr+1,0,makeHold(fx,holdDefault(q,S.lr)),W(fx.id,{seg:fx.seg||'enr'}),{k:'disc'});normalize(q);S.hold=S.lr+1;return go('HOLD')}
  if(k==='L3'&&l.k==='dest'){if(!v)return;if(v==='CLR'){I().altn=null;I().altnRwy=null;return ok()}if(!/^[A-Z]{4}$/.test(v))return err('FORMAT ERROR');if(!DB.apt[v])return err('NOT IN DATA BASE');I().altn=v;I().altnRwy=null;return ok()}
  if(k==='L4'&&l.k==='wpt'&&I().altn&&!S.secMode){enableAltn(S.lr);return go('FPLN')}
  if(k==='R3'&&(l.k==='wpt'||l.k==='dest'||l.k==='orig'&&!flying())){if(!v)return;if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');
    if(!fixReg(v))return err('NOT IN DATA BASE');insertWpt(edit(),l.k==='dest'?S.lr-1:S.lr,v,true);ok();return go('FPLN')}
  if(k==='R4'&&(l.k==='wpt'||l.k==='orig'||l.k==='tp')){if(!v)return;if(!/^[A-Z]{4}$/.test(v))return err('FORMAT ERROR');if(!DB.apt[v])return err('NOT IN DATA BASE');
    newDest(edit(),S.lr,v);   /* the origin is allowed too (return flight plan, immediate return) */S.fpOff=0;ok();return go('FPLN')}
  if(k==='R5'&&l.k==='wpt'){S.awy={idx:S.lr,rows:[]};return go('AWY')}
  if(k==='R2')return err('NOT IN PROTOTYPE');
  return err('NOT ALLOWED')}};

/* ---------- HOLD AT (FlyByWire CDUHoldAtPage) ---------- */
P.HOLD={render(){const p=cur(),l=p&&p.legs[S.hold];if(!l||l.k!=='hold'){S.page='FPLN';return P.FPLN.render()}
  const tm=!!S.tmpy&&!S.secMode,c=tm?'y':'b',mod=l.type==='MODIFIED',sz=x=>mod&&x?'L':'S';
  const time=l.time!=null?l.time:l.dist*60/180,dist=l.dist!=null?l.dist:180*l.time/60;
  csegs(1,[[(mod?'':l.type+' ')+'HOLD','w'],[' AT ','w','S'],[l.fix.padEnd(7),'g']]);
  put(2,0,'INB CRS','w','S');put(3,0,String(l.crs).padStart(3,'0')+'°',c,sz(l.crs!==l.def.crs));
  put(4,0,'TURN','w','S');put(5,0,l.turn,c,sz(l.turn!==l.def.turn));if(mod){rput(4,'REVERT TO','w','S');rput(5,(l.def.type)+'→','b')}
  put(6,0,'TIME/DIST','w','S');segs(7,0,[[time.toFixed(1).padStart(4),c,l.time!=null&&mod?'L':'S'],['/',c],[dist.toFixed(1),c,l.dist!=null&&mod?'L':'S']]);
  rput(8,' LAST EXIT','w','S');rput(9,'UTC   FUEL','w','S');
  {const le=lastExit();rput(10,le?le.utc+'  '+f1(le.fuel):'----  ----',le?'g':'w')}
  if(tm){put(13,0,'←ERASE','a');rput(13,'INSERT*','a')}else put(13,0,'<RETURN')},
 lsk(s,n){const k=s+n,v=S.sp;
  if(k==='L6'){if(S.tmpy&&!S.secMode)S.tmpy=null;S.lr=S.hold-1;const l=cur()&&cur().legs[S.lr];return go(l&&l.k==='wpt'?'LATREV':'FPLN')}
  if(k==='R6'){if(S.tmpy&&!S.secMode){S.active=S.tmpy;S.tmpy=null;return go('FPLN')}return}
  const q=edit(),l=q.legs[S.hold];if(!l||l.k!=='hold')return go('FPLN');
  const modify=()=>{if(l.type!=='MODIFIED'){l.type='MODIFIED'}};
  if(k==='R2'&&l.type==='MODIFIED'){Object.assign(l,{crs:l.def.crs,turn:l.def.turn,time:l.def.time,dist:l.def.dist,type:l.def.type});holdName(l);return}
  if(!v)return;
  if(k==='L1'){if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');if(+v>360)return err('ENTRY OUT OF RANGE');modify();l.crs=+v%360||360;holdName(l);return ok()}
  if(k==='L2'){if(v!=='L'&&v!=='R')return err('FORMAT ERROR');modify();l.turn=v;holdName(l);return ok()}
  if(k==='L3'){const m=v.match(/^(([0-9]{0,1}(\.[0-9])?)\/?|\/([0-9]{0,2}(\.[0-9])?))$/);if(!m||!m[0].length||m[0]==='/')return err('FORMAT ERROR');
    modify();if(m[4]){const d=parseFloat(m[4]);if(!(d>0))return err('ENTRY OUT OF RANGE');l.dist=d;l.time=null}else{const t=parseFloat(m[2]);if(!(t>0))return err('ENTRY OUT OF RANGE');l.time=t;l.dist=null}return ok()}
  return err('NOT ALLOWED')}};
/* LAST EXIT: when the extra fuel is used in the hold (hold fuel flow), and the fuel on board then */
function lastExit(){if(!flying()||FL.ground)return null;const e=destEfob(),pr=predict();if(!e||!pr)return null;
  const extra=e.efob-pr.altn.fuel-pr.final.fuel,ff=PM.hold(gwNowF());if(extra<=0)return{utc:utcStr(FL.utc0+FL.t*1000),fuel:FL.fob};
  return{utc:utcStr(FL.utc0+(FL.t+extra/ff*3600)*1000),fuel:FL.fob-extra}}

/* ---------- F-PLN: hold line (HOLD R, SPD, IMM EXIT* / RESUME HOLD*), OFFSET, hold and PPOS keys ---------- */
function fplnHoldRow(r,ln,lb,col,p,n){const top=n===0;   /* on the first line the label row is the column header */
  if(r.lbl&&!top)put(lb,1,r.lbl,'w','S');put(ln,0,r.id,col);
  if(!top)cput(lb,'HOLD    ','w','S');csegs(ln,[[' ','w'],['SPD','w','S'],[' '+holdSpd(),col]]);
  if(flying()&&p===S.active&&!S.secMode&&r.fix){if(FL.holdExit===r.ix&&(FL.inHold===r.ix)){if(!top)rput(lb,'RESUME ','a');rput(ln,'HOLD*','a')}
    else if(FL.inHold===r.ix||FL.hsActive===r.ix){if(!top)rput(lb,'IMM  ','a');rput(ln,'EXIT*','a')}}}
{const lsk0=P.FPLN.lsk;P.FPLN.lsk=function(s,n){const p=cur();if(p&&n<6){const r=fplnRows(p)[S.fpOff+n-1];
    if(r&&r.k==='hold'){
      if(s==='R'){if(flying()&&p===S.active&&!S.secMode&&r.fix&&(FL.inHold===r.ix||FL.hsActive===r.ix||FL.holdExit===r.ix)){FL.holdExit=FL.holdExit===r.ix?null:r.ix;return}return err('NOT ALLOWED')}
      if(S.sp==='CLR'){const q=edit();q.legs.splice(r.ix,1);normalize(q);return ok()}if(S.sp)return err('NOT ALLOWED');
      if(!r.fix)return err('NOT ALLOWED');S.hold=r.ix;return go('HOLD')}
    if(r&&(r.k==='tp'||r.k==='ca')&&s==='L'&&!S.sp&&flying()&&r.ix===FL.fromIx){S.lr=r.ix;return go('LATREV')}}
  return lsk0.call(this,s,n)}}
/* DIR TO is not allowed while a temporary F-PLN exists; it cancels an offset */
{const lsk0=P.DIR.lsk;P.DIR.lsk=function(s,n){if(S.tmpy&&!S.dirTo&&!(s==='L'&&n===6))return err('TEMPORARY F-PLN EXISTS');return lsk0.call(this,s,n)}}
{const d0=directTo;directTo=function(id){d0(id);if(S.tmpy&&S.tmpy.ofst){delete S.tmpy.ofst}}}

/* ---------- FIX INFO 1/4 to 4/4 (FlyByWire CDUFixInfoPage) ---------- */
/* first crossing, ahead of the aircraft, of the route with a radial or a circle round the fix */
function fixHits(fx){const P=flying()&&FL.path?FL.path:vnPath();if(!P)return{};const s0=flying()?FL.s:0,a=P.pts,F=fx.pos,res={rad:[],radius:null};
  const segs=[];for(let i=1;i<a.length;i++){if(a[i].s<s0)continue;segs.push([enu(F,a[i-1].p),enu(F,a[i].p),a[i-1].s,a[i].s])}
  const cr=(x,y)=>x[0]*y[1]-x[1]*y[0];
  (fx.rad||[]).forEach((rd,j)=>{const b=(rd+fx.vr)*D2R,d=[Math.sin(b),Math.cos(b)];let hit=null;
    for(const[A,B,sa,sb]of segs){const r=[B[0]-A[0],B[1]-A[1]],den=cr(r,d);if(Math.abs(den)<1e-9)continue;const t=-cr(A,d)/den;if(t<0||t>1)continue;
      const X=[A[0]+r[0]*t,A[1]+r[1]*t];if(X[0]*d[0]+X[1]*d[1]<=0)continue;const s=sa+(sb-sa)*t;if(s>=s0+0.1){hit=s;break}}res.rad[j]=hit});
  if(fx.radius){for(const[A,B,sa,sb]of segs){const r=[B[0]-A[0],B[1]-A[1]],qa=r[0]*r[0]+r[1]*r[1],qb=2*(A[0]*r[0]+A[1]*r[1]),qc=A[0]*A[0]+A[1]*A[1]-fx.radius*fx.radius,D=qb*qb-4*qa*qc;
      if(D<0||qa<1e-12)continue;const ts=[(-qb-Math.sqrt(D))/(2*qa),(-qb+Math.sqrt(D))/(2*qa)].filter(t=>t>=0&&t<=1).sort((x,y)=>x-y);
      const t=ts.find(t=>sa+(sb-sa)*t>=s0+0.1);if(t!=null){res.radius=sa+(sb-sa)*t;break}}}
  return res}
function fixCells(s){if(s==null)return'----  ----';const s0=flying()?FL.s:0,d=Math.round(s-s0);
  let t='----';if(flying())t=utcStr(FL.utc0+(FL.t+(s-s0)/Math.max(150,FL.gs)*3600)*1000);else{const pr=predict();if(pr)t=hhmm(pr.trip.at(s))}
  return t+' '+String(d).padStart(4)}
P.FIXINFO={render(){const n=S.fixPg,fx=S.fix[n-1];put(1,5,'FIX INFO');put(1,16,n+'/4','w','S');put(1,22,'←→','w','S');
  put(2,0,'REF FIX '+n,'w','S');
  if(!fx){put(3,0,'_______','a');return}
  put(3,0,fx.id,'b');put(4,0,' RADIAL  TIME  DTG  ALT','w','S');const h=fixHits(fx);
  for(let i=0;i<2;i++){const r=fx.rad[i];if(r!==undefined){put(5+2*i,1,String(r).padStart(3,'0')+'°','b');put(5+2*i,9,fixCells(h.rad[i]),h.rad[i]!=null?'g':'w');put(5+2*i,20,'----','w')}
    else if(i===0||fx.rad[0]!==undefined){put(5+2*i,1,'[ ]°','b');put(5+2*i,9,'----  ----','w');put(5+2*i,20,'----','w');break}}
  put(8,0,' RADIUS','w','S');
  if(fx.radius){put(9,1,String(fx.radius).padStart(3),'b');put(9,4,'NM','b','S');put(9,9,fixCells(h.radius),h.radius!=null?'g':'w');put(9,20,'----','w')}
  else{put(9,1,'[ ]','b');put(9,4,'NM','b','S');put(9,9,'----  ----','w');put(9,20,'----','w')}},
 arrow(d){S.fixPg=((S.fixPg-1+(d>0?1:-1)+4)%4)+1},
 lsk(s,n){const k=s+n,v=S.sp,fx=S.fix[S.fixPg-1];if(!v)return;const C=v==='CLR';
  if(k==='L1'){if(C){if(!fx)return err('NOT ALLOWED');S.fix[S.fixPg-1]=null;return ok()}
    if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');const pos=anyPos(v);if(!pos)return err('NOT IN DATA BASE');
    S.fix[S.fixPg-1]={id:v,pos,rad:[],radius:null,vr:S.active?magVarOf(S.active):0};return ok()}
  if(!fx)return err('NOT ALLOWED');
  if(k==='L2'||k==='L3'){const i=n-2;if(i===1&&fx.rad[0]===undefined)return err('NOT ALLOWED');
    if(C){if(fx.rad[i]===undefined)return err('NOT ALLOWED');fx.rad.splice(i);return ok()}
    if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');if(+v>360)return err('ENTRY OUT OF RANGE');fx.rad[i]=+v%360;return ok()}
  if(k==='L4'){if(C){if(!fx.radius)return err('NOT ALLOWED');fx.radius=null;return ok()}if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');
    if(+v<1||+v>256)return err('ENTRY OUT OF RANGE');fx.radius=+v;return ok()}
  return err('NOT ALLOWED')}};

/* ---------- ND: FIX INFO (cyan dashed radials and circle, FlyByWire FixInfoLayer) ---------- */
function ndFixInfo(g,pj,V){for(const fx of S.fix){if(!fx)continue;const[x,y]=pj(fx.pos),k=V.R/V.nm;
  g.save();g.strokeStyle='#3fd2ff';g.lineWidth=2.5;g.setLineDash([15,12]);g.beginPath();
  for(const r of fx.rad){if(r==null)continue;const a=(r+fx.vr-V.rot)*D2R;g.moveTo(x,y);g.lineTo(x+Math.sin(a)*1600,y-Math.cos(a)*1600)}
  if(fx.radius){g.moveTo(x+fx.radius*k,y);g.arc(x,y,fx.radius*k,0,Math.PI*2)}g.stroke();g.restore()}}
window.__fix=()=>S.fix;
