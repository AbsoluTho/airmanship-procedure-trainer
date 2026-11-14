'use strict';
/* ================= state ================= */
let S;
function freshState(){return{page:'INIT',title:'',sp:'',msg:null,msgs:[{t:'GPS PRIMARY',a:false}],
  init:{from:null,to:null,altn:null,flt:null,ci:null,crz:null,temp:null,tropo:null,gnd:null},
  active:null,tmpy:null,fpOff:0,lr:0,dep:{list:'RWY',off:0},arr:{list:'APPR',off:0},awy:null,
  fuel:{zfw:null,cg:null,block:null,taxi:null,rsv:null,rsvPct:null,altn:null,final:null,finalTime:null,wind:null,minFob:null},
  perf:{v1:null,vr:null,v2:null,shift:null,flaps:null,ths:null,flex:null,ta:null,thr:null,acc:null,eoacc:null,rwyRef:null},
  elec:{bat1:false,bat2:false,ext:false,apu:false}}}
S=freshState();
const I=()=>S.init;
const clone=o=>JSON.parse(JSON.stringify(o));
const cur=()=>S.secMode?S.sec:(S.tmpy||S.active);
/* the SEC F-PLN is revised directly: no temporary flight plan */
function edit(){if(S.secMode)return S.sec;if(!S.tmpy)S.tmpy=clone(S.active);return S.tmpy}
function newPlan(f,t){return{rwy:null,sid:null,trans:null,appr:null,via:null,star:null,legs:[{k:'orig',id:f},{k:'disc'},{k:'dest',id:t}]}}
function idxK(p,k){return p.legs.findIndex(l=>l.k===k)}
function normalize(p){const L=p.legs;let ch=true;
  while(ch){ch=false;
    for(let i=0;i<L.length-1;i++){const a=L[i],b=L[i+1],c=L[i+2];
      if(a.k==='disc'&&b.k==='disc'){L.splice(i,1);ch=true;break}
      if(a.k==='wpt'&&b.k==='wpt'&&a.id===b.id){L.splice(i,1);ch=true;break}
      if(c&&a.k==='wpt'&&b.k==='disc'&&c.k==='wpt'&&a.id===c.id){L.splice(i,2);ch=true;break}}}}
function dropSeg(p,...segs){p.legs=p.legs.filter(l=>!segs.includes(l.seg))}
/* first departure leg: climb on runway track to 400 ft AAL (SID) or 1500 ft AAL (runway only, visual departure) */
function caLeg(p,aal){const ap=DB.apt[p.legs[0].id],r=ap.rwy[p.rwy],a=Math.round((r.tdze??ap.elev)+aal);
  return{k:'ca',id:'('+a+')',lbl:'C'+String(r.crs).padStart(3,'0')+'°',ca:a,aal,seg:'dep',via:p.sid||''}}
/* NO SID: the runway threshold only, followed by a discontinuity (no climb leg, no SID) */
function setNoSid(p){dropSeg(p,'dep');p.legs=p.legs.filter((l,i)=>!(i>0&&l.k==='ca'));p.sid=null;p.trans=null;p.noSid=true;if(p.legs[1]&&p.legs[1].k!=='disc')p.legs.splice(1,0,{k:'disc'});normalize(p)}
function setRunway(p,r){p.rwy=r;p.legs[0].rwy=r;dropSeg(p,'dep');p.sid=null;p.trans=null;p.noSid=false;
  p.legs.splice(1,0,caLeg(p,1500));if(p.legs[2].k!=='disc')p.legs.splice(2,0,{k:'disc'});normalize(p)}
function setSid(p,sid){dropSeg(p,'dep');p.sid=sid;p.noSid=false;const legs=[caLeg(p,400),...clone(SIDS[p.legs[0].id][p.rwy][sid]).map(l=>l.k==='ca'?caLeg(p,l.aal):l).map(l=>Object.assign(l,{seg:'dep',via:sid}))];   /* radar SIDs: a climb leg to their altitude */
  p.legs.splice(1,0,...legs);const nx=p.legs[1+legs.length],last=legs[legs.length-1];
  if(nx&&nx.k!=='disc'&&!(nx.k==='wpt'&&nx.id===last.id))p.legs.splice(1+legs.length,0,{k:'disc'});
  p.sid=sid;p.trans=null;normalize(p)}
/* arrival: STAR, then the approach via, then the final approach and the missed approach. A fix shared by two parts
   is kept once, where the later part starts (its constraints win). Without an approach (or a runway only) the STAR alone. */
function buildArr(p){dropSeg(p,'arr','map');const di=idxK(p,'dest'),d=p.legs[di];const ap=(APPRS[d.id]||{})[p.appr];
  const st=p.star&&p.star!=='NO STAR'&&(STARS[d.id]||{})[p.star],tag=(L,v)=>clone(L).map(l=>Object.assign(l,{seg:'arr',via:v}));
  let legs=st?tag(st.legs,p.star):[];
  /* each next part takes over from its first fix when the legs so far already fly through it */
  for(const part of[ap&&p.via&&ap.vias[p.via]?tag(ap.vias[p.via],p.via):[],ap?tag(ap.final,p.appr):[]]){if(!part.length)continue;
    const j=legs.findIndex(l=>l.k==='wpt'&&l.id===part[0].id);legs=j>=0?[...legs.slice(0,j),...part]:[...legs,...part]}
  if(ap){d.rwy=ap.rwy;d.lbl=ap.dest.lbl;d.alt=ap.dest.alt;d.via=p.appr}
  if(!legs.length){normalize(p);return}
  p.legs.splice(di,0,...legs);const pv=p.legs[di-1];
  if(pv.k!=='disc'&&!(pv.k==='wpt'&&pv.id===legs[0].id))p.legs.splice(di,0,{k:'disc'});
  if(ap){const d2=idxK(p,'dest');p.legs.splice(d2+1,0,...clone(ap.missed).map(l=>Object.assign(l,{seg:'map',via:''})))}normalize(p)}
function insertAwy(p,fi,via,to){const from=p.legs[fi].id;let seq;
  if(via){const L=AWY[via],i=L.indexOf(from),j=L.indexOf(to);seq=i<j?L.slice(i+1,j+1):L.slice(j,i).reverse()}else seq=[to];
  const legs=seq.map(id=>W(id,{seg:'enr',via:via||''}));
  const k=p.legs.findIndex((l,ix)=>ix>fi&&l.k==='wpt'&&l.id===to);
  if(k>0)p.legs.splice(fi+1,k-fi-1,...legs.slice(0,-1));
  else{p.legs.splice(fi+1,0,...legs);const af=p.legs[fi+1+legs.length];if(af&&af.k!=='disc')p.legs.splice(fi+1+legs.length,0,{k:'disc'})}
  normalize(p);return p.legs.findIndex((l,ix)=>ix>fi&&l.k==='wpt'&&l.id===to)}
function insertWpt(p,i,id,after){
  const j=p.legs.findIndex((l,ix)=>ix>(after?i:i-1)&&l.k==='wpt'&&l.id===id);
  const at=after?i+1:i;
  if(j>=at){p.legs.splice(at,j-at)}
  else if(!after&&p.legs[i].k==='disc')p.legs.splice(i,1,W(id,{seg:'enr'}),{k:'disc'});
  else p.legs.splice(at,0,W(id,{seg:'enr'}),{k:'disc'});
  normalize(p)}
function legPos(l){if(l.k==='wpt'||l.k==='altwpt')return DB.wpt[l.id];if(l.k==='tp')return l.pos;
  if(l.k==='altorig'){const a=DB.apt[l.id];return l.rwy&&a.rwy[l.rwy]?a.rwy[l.rwy].pos:a.pos}
  if(l.k==='orig'||l.k==='dest'||l.k==='altn'){const a=DB.apt[l.id];return l.rwy&&a.rwy[l.rwy]?a.rwy[l.rwy].pos:a.pos}return null}
function dists(p){let prev=null;return p.legs.map(l=>{
  if(l.k==='disc'){prev=null;return null}
  const pos=legPos(l);if(l.k==='orig'){prev=pos;return null}
  let d=null;if(prev)d=l.dist!=null?l.dist:(pos?gc(prev,pos):null);
  if(pos)prev=pos;else if(l.k==='proc')prev=null;return d})}

/* ================= screen buffer ================= */
const COLS=24,ROWS=14,BOX='□';
let BUF;
function clr(){BUF=Array.from({length:ROWS},()=>Array.from({length:COLS},()=>({ch:' ',c:'w',s:'L'})))}
function put(r,c,t,col,s){t=String(t);for(let i=0;i<t.length;i++){const x=c+i;if(x<0||x>=COLS)continue;BUF[r-1][x]={ch:t[i],c:col||'w',s:s||'L'}}}
function rput(r,t,col,s,end){put(r,(end==null?COLS:end)-String(t).length,t,col,s)}
function cput(r,t,col,s){put(r,Math.floor((COLS-String(t).length)/2),t,col,s)}
function segs(r,start,parts){let c=start;for(const[t,col,s]of parts){put(r,c,t,col,s);c+=t.length}}
function csegs(r,parts){const n=parts.reduce((a,p)=>a+p[0].length,0);segs(r,Math.floor((COLS-n)/2),parts)}
const fT=t=>(t>=0?'+':'')+t;
function fAlt(a){if(!a)return'-----';const v=a.v>13000?'FL'+String(Math.round(a.v/100)).padStart(3,'0'):String(a.v);return(a.t==='@'?'':a.t)+v}
function tmpyFoot(){if(S.tmpy&&!S.secMode){put(12,1,'TMPY','y','S');rput(12,'TMPY','y','S',23);put(13,0,'←ERASE','a');rput(13,'INSERT*','a');return true}return false}

/* ================= pages ================= */
const P={};
P.INIT={render(){const i=I();
  cput(1,'INIT');put(1,22,'→');
  put(2,1,'CO RTE','w','S');rput(2,'FROM/TO','w','S',23);
  if(!i.from){put(3,0,BOX.repeat(10),'a');rput(3,BOX.repeat(4)+'/'+BOX.repeat(4),'a')}
  else{put(3,0,'----------','b');rput(3,i.from+'/'+i.to,'b')}
  put(4,1,'ALTN/CO RTE','w','S');rput(4,'INIT ','w','S',23);
  if(!i.to)put(5,0,'----/----------','b');else put(5,0,i.altn||'NONE','b');
  rput(5,'REQUEST*','a');
  put(6,1,'FLT NBR','w','S');
  if(i.flt)put(7,0,i.flt,'b');else put(7,0,BOX.repeat(8),'a');
  rput(7,'IRS INIT>');rput(9,'WIND>');
  put(10,1,'COST INDEX','w','S');rput(10,'TROPO','w','S',23);
  if(i.ci!=null)put(11,0,String(i.ci),'b');else if(i.from)put(11,0,BOX.repeat(3),'a');else put(11,0,'---','b');
  rput(11,String(i.tropo??36090),'b',i.tropo?'L':'S');
  put(12,1,'CRZ FL/TEMP','w','S');rput(12,'GND TEMP','w','S',23);
  if(i.crz){put(13,0,'FL'+String(i.crz).padStart(3,'0')+'/','b');
    if(i.temp!=null)put(13,6,fT(i.temp)+'°','b');else put(13,6,fT(Math.round(15-2*i.crz/10))+'°','b','S')}
  else if(i.from){put(13,0,BOX.repeat(5),'a');put(13,5,'/---°','b')}else put(13,0,'-----/---°','b');
  rput(13,i.gnd!=null?fT(i.gnd)+'°':'---°','b',i.gnd!=null?'L':'S')},
 lsk(s,n){const i=I(),v=S.sp,k=s+n;
  if(k==='R2'||k==='R3'||k==='R4')return err('NOT IN PROTOTYPE');
  if(!v)return;
  switch(k){
  case'L1':return err('NOT IN DATA BASE');
  case'R1':{const m=v.match(/^([A-Z]{4})\/([A-Z]{4})$/);if(!m)return err('FORMAT ERROR');
    if(!DB.apt[m[1]]||!DB.apt[m[2]])return err('NOT IN DATA BASE');
    i.from=m[1];i.to=m[2];i.altn=null;S.active=newPlan(m[1],m[2]);S.tmpy=null;S.fpOff=0;return ok()}
  case'L2':if(!i.to)return err('NOT ALLOWED');if(v==='CLR'){i.altn=null;return ok()}
    if(!/^[A-Z]{4}$/.test(v))return err('FORMAT ERROR');if(!DB.apt[v])return err('NOT IN DATA BASE');i.altn=v;i.altnRwy=null;return ok();
  case'L3':if(!/^[A-Z0-9]{1,8}$/.test(v))return err('FORMAT ERROR');i.flt=v;return ok();
  case'L5':if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');i.ci=+v;return ok();
  case'L6':{const m=v.match(/^(?:FL)?(\d{1,3})?(?:\/([+-]?\d{1,2}))?$/);if(!m||(!m[1]&&m[2]==null))return err('FORMAT ERROR');
    if(m[1]){const fl=+m[1];if(fl<10||fl>398)return err('ENTRY OUT OF RANGE');i.crz=fl;if(m[2]==null)i.temp=null}
    if(m[2]!=null){if(!i.crz)return err('NOT ALLOWED');i.temp=/^[+-]/.test(m[2])?+m[2]:-m[2]}return ok()}
  case'R5':{if(!/^\d{1,5}$/.test(v))return err('FORMAT ERROR');const tp=v.length<=3?+v*100:+v;if(tp<1000||tp>60000)return err('ENTRY OUT OF RANGE');i.tropo=tp;return ok()}
  case'R6':if(!/^[+-]?\d{1,2}$/.test(v))return err('FORMAT ERROR');i.gnd=+v;return ok();
  default:return err('NOT ALLOWED')}}};

function fplnRows(p){let rows=p?p.legs.map((l,ix)=>Object.assign({},l,{ix})):[];
  if(p&&flying()&&(p===S.active||p===S.tmpy)&&!S.secMode)rows=rows.filter(r=>r.ix>=FL.fromIx);   /* sequenced legs disappear; first line is the FROM waypoint */
  rows.push({k:'end',t:'END OF F-PLN'});
  /* alternate F-PLN: destination, then direct to the alternate airport (shown in blue) */
  if(I().altn&&p){const d=p.legs[idxK(p,'dest')],R=altRte();rows.push({k:'altorig',id:d.id,rwy:d.rwy});
    R.wpts.forEach((id,i)=>rows.push({k:'altwpt',id,i}));if(!R.dct)rows.push({k:'altdisc'});
    rows.push({k:'altn',id:I().altn,rwy:I().altnRwy||null,via:R.wpts.length?'':'DCT'});rows.push({k:'end',t:'END OF ALTN F-PLN'})}
  else rows.push({k:'end',t:'NO ALTN F-PLN'});
  return rows}
/* ALTN F-PLN: waypoints entered by the pilot, and a discontinuity before the ALTN airport until it is cleared (then DCT) */
function altRte(){const i=I();if(!i.altR||i.altR.altn!==i.altn)i.altR={altn:i.altn,wpts:[],dct:false};return i.altR}
const dash=t=>{const n=COLS-t.length,a=Math.floor(n/2);return'-'.repeat(a)+t+'-'.repeat(n-a)};
function planCentre(p){const rows=fplnRows(p);for(let j=Math.min(S.fpOff+1,rows.length-1);j>=0;j--){const r=rows[j];
  const pos=(r.k==='altn')?legPos(r):(r.k&&r.k!=='end'&&r.k!=='disc')?legPos(r):null;if(pos)return{pos,id:r.id}}return null}
P.FPLN={render(){const p=cur(),rows=fplnRows(p),ds=p?dists(p):[];
  if(p){const c=planCentre(p);if(c)EFIS.ctr=c}
  const pr=predict(),tcum=pr&&p===S.active?pr.cum:null;
  put(1,1,'FROM','w','S');if(S.secMode)put(1,6,'SEC','w');else if(S.tmpy)put(1,6,'TMPY','y');else if(p&&p.ofst)put(1,6,'OFST '+p.ofst.side+p.ofst.nm,'g');if(I().flt)rput(1,I().flt,'w','L',23);
  const base=S.tmpy?'y':'g';let firstD=true;
  for(let n=0;n<5;n++){const r=rows[S.fpOff+n];if(!r)break;const ln=3+2*n,lb=ln-1;
    if(n===0){put(lb,8,flying()?'UTC':'TIME','w','S');rput(lb,'SPD/ALT','w','S',22)}
    if(r.k==='end'){put(ln,0,dash(r.t),'w');continue}
    if(r.k==='disc'||r.k==='altdisc'){put(ln,0,dash('F-PLN DISCONTINUITY'),'w');continue}
    const alt_=r.k==='altn'||r.k==='altorig'||r.k==='altwpt';
    const col=alt_||r.seg==='map'?'b':(flying()&&p===S.active&&!S.tmpy&&n===1&&S.fpOff===0)?'w':base;   /* TO waypoint in white */
    if(r.k==='hold'){fplnHoldRow(r,ln,lb,col,p,n);continue}
    if(r.k==='pw'){fplnPwRow(r,ln,lb,col);continue}
    if((r.k==='altn'||r.k==='altwpt')&&n>0){const pr_=rows[S.fpOff+n-1];if(r.via)put(lb,1,r.via,'w','S');
      const a0=pr_&&pr_.k!=='altdisc'?legPos(pr_.k==='altwpt'?{k:'wpt',id:pr_.id}:pr_):null,a1=legPos(r.k==='altwpt'?{k:'wpt',id:r.id}:r);if(a0&&a1)rput(lb,String(Math.round(gc(a0,a1))),'w','S',19)}
    if(n>0&&!alt_){put(lb,1,(r.via||'').slice(0,6),'w','S');if(r.lbl)put(lb,8,r.lbl,'w','S');if(r.step!=null&&typeof stepKind==='function')put(lb,8,stepKind(p,r.ix),'w','S');
      const d=ds[r.ix];if(d!=null){const t=String(Math.round(d));if(firstD){rput(lb,t+'NM','w','S',21);firstD=false}else rput(lb,t,'w','S',19)}}
    const id=(r.k==='orig'||r.k==='dest'||alt_)?r.id+(r.rwy||''):r.id;
    const tm=tcum&&!alt_&&tcum[r.ix]!=null?(flying()?utcStr(FL.utc0+(pr.trip.at(tcum[r.ix])+1)*60000):hhmm(pr.trip.at(tcum[r.ix])+(r.k==='orig'?0:1))):null;
    put(ln,0,id.slice(0,7),col);if(tm)put(ln,8,tm,col);else put(ln,8,'----','w');
    if(r.k==='orig'){rput(ln,'---/'+String(DB.apt[r.id].elev).padStart(6),col)}
    else{const sp=r.spd?String(r.spd):'---',al=r.alt?fAlt(r.alt):'-----';
      const st=24-(4+1+6);put(ln,st,sp.padStart(4),r.spd?'m':'w');put(ln,st+4,'/','w');
      /* with predictions: the predicted altitude, after a magenta star (constraint met) or an amber star (missed) */
      const vq=r.alt&&tcum&&p===S.active&&!S.tmpy&&!S.secMode&&S.phase!=='GA'&&typeof vPred==='function'?(vPred()||{wp:{}}).wp[r.ix]:null;
      if(vq){const a=Math.round(vq.alt/10)*10,t=a>13000?'FL'+String(Math.round(a/100)).padStart(3,'0'):String(a);put(ln,st+5,('*'+t).padStart(6),'g');put(ln,st+5+Math.max(0,6-t.length-1),'*',vq.met?'m':'a')}
      else put(ln,st+5,al.padStart(6),r.alt?'m':'w')}}
  if(!tmpyFoot()&&p){const di=idxK(p,'dest'),d=p.legs[di];
    let tot=0;ds.forEach((x,ix)=>{if(ix<=di&&x)tot+=x});if(flying()&&p===S.active)tot=Math.max(0,FL.path.sThr-FL.s);   /* distance to the runway counts down in flight */
    put(12,1,'DEST','w','S');put(12,8,flying()?'UTC':'TIME','w','S');rput(12,'DIST','w','S',17);rput(12,'EFOB','w','S',24);
    put(13,0,(d.id+(d.rwy||'')).slice(0,7),'g');rput(13,String(Math.round(tot)),'g','L',17);
    if(pr){put(13,8,flying()?utcStr(FL.utc0+pr.trip.time*60000):hhmm(pr.trip.time),'g');rput(13,f1(flying()?FL.fob-pr.trip.fuel*Math.max(0,FL.path.sThr-FL.s)/FL.path.sThr:S.fuel.block-pr.taxi-pr.trip.fuel),'g')}else{put(13,8,'----','w');rput(13,'----','w')}}},
 lsk(s,n){const p=cur();if(!p)return err('NOT ALLOWED');
  if(n===6){if(S.tmpy){if(s==='L')S.tmpy=null;else{S.active=S.tmpy;S.tmpy=null}return ok()}
    if(s==='L'){S.lr=idxK(p,'dest');return go('LATREV')}return err('NOT IN PROTOTYPE')}
  const r=fplnRows(p)[S.fpOff+n-1];if(!r)return;
  if(s==='R')return err('NOT IN PROTOTYPE');
  if(r.k==='end'||r.k==='altorig')return err('NOT ALLOWED');
  if(r.k==='altn'){if(S.sp==='CLR'){I().altn=null;I().altnRwy=null;return ok()}if(S.sp)return err('NOT ALLOWED');S.lr=-1;return go('LATREV')}
  /* ALTN route: a waypoint typed on the discontinuity or on a waypoint is inserted there; CLR on the discontinuity joins DCT */
  if(r.k==='altdisc'||r.k==='altwpt'){const R=altRte(),v=S.sp;if(!v)return err('NOT ALLOWED');
    if(v==='CLR'){if(r.k==='altdisc')R.dct=true;else R.wpts.splice(r.i,1);return ok()}
    if(!DB.wpt[v]&&!(DB.nav&&DB.nav[v]))return err('NOT IN DATA BASE');if(!DB.wpt[v])DB.wpt[v]=DB.nav[v].pos;
    R.wpts.splice(r.k==='altdisc'?R.wpts.length:r.i,0,v);return ok()}
  const v=S.sp;
  if(v==='CLR'){if(r.k==='orig'||r.k==='dest')return err('NOT ALLOWED');const q=edit();
    if(r.k==='disc')q.legs.splice(r.ix,1);else q.legs.splice(r.ix,1,{k:'disc'});normalize(q);return ok()}
  if(v){if(r.k==='orig')return err('NOT ALLOWED');if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');
    if(!DB.wpt[v])return err('NOT IN DATA BASE');insertWpt(edit(),r.ix,v,false);return ok()}
  if(r.k!=='orig'&&r.k!=='wpt'&&r.k!=='dest')return err('NOT ALLOWED');
  S.lr=r.ix;go('LATREV')},
 slew(d){const p=cur();const n=fplnRows(p).length;S.fpOff=Math.max(0,Math.min(n-1,S.fpOff+d))}};

P.LATREV={render(){const p=cur(),l=S.lr===-1?{k:'altn',id:I().altn,rwy:I().altnRwy}:p.legs[S.lr];
  csegs(1,[['LAT REV','w'],[' FROM ','w','S'],[l.id,'g']]);
  const pos=legPos(l);if(pos)cput(2,fmtLL(pos),'g','S');
  if(l.k==='orig'){put(3,0,'<DEPARTURE');rput(3,'FIX INFO>')}
  else if(l.k==='altn'){rput(3,'ARRIVAL>')}
  else if(l.k==='dest'){rput(3,'ARRIVAL>');put(6,1,'ALTN','w','S');put(7,0,I().altn?'<'+I().altn:'[    ]','b');rput(4,'LL XING/INCR/NO','w','S',23);rput(5,'[  ]°/[ ]°/[]','b')}
  else{rput(3,'FIX INFO>');put(5,0,'<OFFSET');rput(4,'LL XING/INCR/NO','w','S',23);rput(5,'[  ]°/[ ]°/[]','b');
    put(7,0,'<HOLD');rput(6,'NEXT WPT','w','S',23);rput(7,'[    ]','b');rput(8,'NEW DEST','w','S',23);rput(9,'[   ]','b');rput(11,'AIRWAYS>');
    if(I().altn&&l.k==='wpt'&&!S.secMode){put(8,1,'ENABLE','b','S');put(9,0,'{ALTN','b')}}
  if(l.k==='orig'){rput(6,'NEXT WPT','w','S',23);rput(7,'[    ]','b');rput(8,'NEW DEST','w','S',23);rput(9,'[   ]','b')}
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),l=S.lr===-1?{k:'altn',id:I().altn,rwy:I().altnRwy}:p.legs[S.lr],k=s+n;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  if(k==='L1'&&l.k==='orig'){S.dep={list:p.rwy?'SID':'RWY',off:0};return go('DEP')}
  if(k==='R1'&&l.k==='altn'){S.arrAlt=true;S.arr={list:'APPR',off:0};return go('ARR')}
  if(k==='R1'&&l.k==='dest'){S.arrAlt=false;const hasA=(APPRS[l.id]||{})[p.appr];S.arr={list:p.appr&&hasA?'VIA':'APPR',off:0};return go('ARR')}
  if(k==='L4'&&l.k==='dest'){const v=S.sp;if(!v)return;if(v==='CLR'){I().altn=null;I().altnRwy=null;return ok()}if(!/^[A-Z]{4}$/.test(v))return err('FORMAT ERROR');if(!DB.apt[v])return err('NOT IN DATA BASE');I().altn=v;I().altnRwy=null;return ok()}
  if(k==='L4'&&l.k==='wpt'&&I().altn&&!S.secMode){enableAltn(S.lr);return go('FPLN')}
  if(k==='R3'&&l.k!=='dest'){const v=S.sp;if(!v)return;if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');
    if(!DB.wpt[v])return err('NOT IN DATA BASE');insertWpt(edit(),S.lr,v,true);ok();return go('FPLN')}
  if(k==='R5'&&l.k==='wpt'){S.awy={idx:S.lr,rows:[]};return go('AWY')}
  return err('NOT IN PROTOTYPE')}};

P.DEP={items(){const p=cur(),o=p.legs[0],ap=DB.apt[o.id];
  if(S.dep.list==='RWY')return Object.entries(ap.rwy).map(([id,r])=>({id,txt:('<'+id).padEnd(6)+(r.len+'M').padStart(6)+'  CRS'+r.crs}));
  if(S.dep.list==='SID'){const t=(SIDS[o.id]||{})[p.rwy];return[{id:'NOSID',txt:'<NO SID'}].concat(t?Object.keys(t).map(id=>({id,txt:'<'+id})):[])}
  return[{id:'NONE',txt:'<NO TRANS'}]},
 render(){const p=cur(),o=p.legs[0],c=S.tmpy?'y':'g';
  csegs(1,[['DEPARTURES','w'],[' FROM ','w','S'],[o.id,'g']]);
  put(2,1,'RWY','w','S');put(2,9,'SID','w','S');put(2,17,'TRANS','w','S');
  put(3,1,p.rwy||'---',p.rwy?c:'w');put(3,9,p.sid||(p.noSid?'NONE':'------'),p.sid||p.noSid?c:'w');put(3,17,p.sid?(p.trans||'------'):'------',p.trans?c:'w');
  cput(4,{RWY:'AVAILABLE RUNWAYS',SID:'AVAILABLE SIDS',TRANS:'AVAILABLE TRANS'}[S.dep.list],'w','S');
  const it=this.items();for(let n=0;n<4;n++){const x=it[S.dep.off+n];if(x)put(5+2*n,0,x.txt,'b')}
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),k=s+n;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  if(k==='L1'){S.dep={list:'RWY',off:0};return}
  if(k==='R1'){if(!p.rwy)return err('NOT ALLOWED');S.dep={list:p.sid?'TRANS':'SID',off:0};return}
  if(s==='L'&&n>=2&&n<=5){const x=this.items()[S.dep.off+n-2];if(!x)return;if(!x.id)return err('NOT ALLOWED');
    if(S.dep.list==='RWY'){setRunway(edit(),x.id);S.dep={list:'SID',off:0}}
    else if(S.dep.list==='SID'){if(x.id==='NOSID'){setNoSid(edit());return}setSid(edit(),x.id);S.dep={list:'TRANS',off:0}}
    else{edit().trans='NONE'}return}
  return err('NOT ALLOWED')},
 slew(d){const n=this.items().length;S.dep.off=Math.max(0,Math.min(Math.max(0,n-4),S.dep.off-d))}};

/* ENABLE ALTN (FlyByWire A32NX): the route after this waypoint is replaced by a direct leg to the alternate, which becomes the destination */
function enableAltn(ix){const p=S.tmpy||S.active,a=I().altn,R=altRte();p.legs=p.legs.slice(0,ix+1);R.wpts.forEach(id=>p.legs.push(W(id,{seg:'enr'})));p.legs.push({k:'dest',id:a,rwy:I().altnRwy||null});
  p.appr=null;p.via=null;p.star=null;I().to=a;I().altn=null;I().altnRwy=null;S.fpOff=0;ok()}
const arrApt=()=>{const p=cur();return S.arrAlt?I().altn:p.legs[idxK(p,'dest')].id};
P.ARR={items(){const p=cur(),aid=arrApt(),t=S.arrAlt?{}:(APPRS[aid]||{});
  if(S.arr.list==='APPR'&&!Object.keys(t).length){const rw=Object.keys((DB.apt[aid]||{rwy:{}}).rwy);return rw.length?rw.map(r=>({id:'RWY'+r,rwy:r,txt:('<RWY'+r).padEnd(8)+'CRS'+String(DB.apt[aid].rwy[r].crs).padStart(3,'0')})):[{id:null,txt:'<NO APPR'}]}
  if(S.arr.list==='APPR'){const k=Object.keys(t);return k.length?k.map(id=>({id,txt:('<'+id).padEnd(8)+(t[id]?'CRS'+String(t[id].crs).padStart(3,'0')+' '+(t[id].nav||t[id].vor||''):'')})):[{id:null,txt:'<NO APPR'}]}
  if(S.arr.list==='VIA'){const ap=t[p.appr];return[{id:'NO VIA',txt:'<NO VIA'},...Object.keys(ap.vias).map(id=>({id,txt:'<'+id}))]}
  const ss=S.arrAlt?{}:(STARS[aid]||{}),ap=t[p.appr],rw=ap?ap.rwy:(p.appr&&/^RWY/.test(p.appr)?p.appr.slice(3):null);
  return[{id:'NO STAR',txt:'<NO STAR'},...Object.keys(ss).filter(id=>!rw||ss[id].rwys.includes(rw)).map(id=>({id,txt:'<'+id}))]},
 render(){const p=cur(),d=p.legs[idxK(p,'dest')],c=S.tmpy?'y':'g';
  csegs(1,[['ARRIVAL','w'],[' TO ','w','S'],[arrApt(),S.arrAlt?'b':'g']]);
  put(2,1,'APPR','w','S');put(2,10,'VIA','w','S');
  const ap_=S.arrAlt?(I().altnRwy?'RWY'+I().altnRwy:null):p.appr;
  put(3,1,ap_||'------',ap_?(S.arrAlt?'b':c):'w');put(3,10,ap_&&!S.arrAlt?(p.via||'NO VIA'):'------',ap_&&!S.arrAlt?c:'w');
  put(4,1,'STAR','w','S');put(4,10,'TRANS','w','S');
  put(5,1,p.star||'------',p.star?c:'w');put(5,10,'------','w');
  cput(6,{APPR:'APPROACHES',VIA:'APPR VIAS',STAR:'STARS'}[S.arr.list],'w','S');
  const it=this.items();for(let n=0;n<3;n++){const x=it[S.arr.off+n];if(x)put(7+2*n,0,x.txt,'b')}
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),k=s+n;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  if(k==='L1'){S.arr={list:'APPR',off:0};return}
  if(k==='R1'){if(S.arrAlt||!p.appr||!(APPRS[arrApt()]||{})[p.appr])return err('NOT ALLOWED');S.arr={list:'VIA',off:0};return}
  if(k==='L2'){S.arr={list:'STAR',off:0};return}
  if(s==='L'&&n>=3&&n<=5){const x=this.items()[S.arr.off+n-3];if(!x)return;if(!x.id)return err('NOT ALLOWED');
    if(x.rwy){if(S.arrAlt){I().altnRwy=x.rwy;return}const q=edit();dropSeg(q,'arr','map');const d=q.legs[idxK(q,'dest')];d.rwy=x.rwy;q.appr=x.id;q.via=null;q.star=null;S.arr={list:'STAR',off:0};return}
    if(S.arr.list==='APPR'){const d=p.legs[idxK(p,'dest')];if(!(APPRS[d.id]||{})[x.id])return err('NOT IN DATA BASE');
      const q=edit();q.appr=x.id;q.via=null;q.star=null;buildArr(q);S.arr={list:'VIA',off:0}}
    else if(S.arr.list==='VIA'){const q=edit();q.via=x.id==='NO VIA'?null:x.id;buildArr(q);S.arr={list:'STAR',off:0}}
    else{const q=edit();q.star=x.id;buildArr(q)}return}
  return err('NOT ALLOWED')},
 slew(d){const n=this.items().length;S.arr.off=Math.max(0,Math.min(Math.max(0,n-3),S.arr.off-d))}};

P.AWY={render(){const p=cur(),a=S.awy;
  const startId=a.rows.length?a.rows[0].fromId:p.legs[a.idx].id;
  csegs(1,[['AIRWAYS','w'],[' FROM ','w','S'],[startId,'g']]);
  put(2,1,'VIA','w','S');rput(2,'TO','w','S',22);
  const R=a.rows;for(let r=0;r<5;r++){const ln=3+2*r;
    if(r<R.length){put(ln,1,R[r].via,'y');if(R[r].to)rput(ln,R[r].to,'y','L',23);else rput(ln,'[     ]','b')}
    else{put(ln,0,'[    ]','b');if(!R.length||R[R.length-1].to)rput(ln,'[     ]','b');break}}
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const a=S.awy,k=s+n,R=a.rows;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  const v=S.sp;if(!v||n>5)return;
  const last=R[R.length-1],pend=last&&!last.to;
  const fromId=cur().legs[a.idx].id;
  if(s==='L'){if(n-1!==R.length)return err('NOT ALLOWED');if(!AWY[v])return err('NOT IN DATA BASE');
    if(pend){/* close the previous airway at its intersection with the new one */
      const L1=AWY[last.via],i0=L1.indexOf(last.fromId);
      const cand=AWY[v].filter(w=>w!==last.fromId&&L1.includes(w)).sort((x,y)=>Math.abs(L1.indexOf(x)-i0)-Math.abs(L1.indexOf(y)-i0));
      if(!cand.length||v===last.via)return err('NO INTERSECTION FOUND');
      const X=cand[0];const q=edit();a.idx=insertAwy(q,a.idx,last.via,X);last.to=X;R.push({via:v,to:null,fromId:X});return ok()}
    if(!AWY[v].includes(fromId))return err('AWY/WPT MISMATCH');
    R.push({via:v,to:null,fromId});return ok()}
  if(!DB.wpt[v])return err('NOT IN DATA BASE');
  if(pend&&n-1===R.length-1){if(!AWY[last.via].includes(v)||v===last.fromId)return err('AWY/WPT MISMATCH');
    const q=edit();a.idx=insertAwy(q,a.idx,last.via,v);last.to=v;return ok()}
  if(!pend&&n-1===R.length){if(v===fromId)return err('NOT ALLOWED');const q=edit();a.idx=insertAwy(q,a.idx,null,v);R.push({via:'DCT',to:v,fromId});return ok()}
  return err('NOT ALLOWED')}};

/* INIT B (fuel and weight). Units: tonnes. */
const dashF='---.-/----';
function num(v,lo,hi,dp){if(!new RegExp('^\\d{1,3}(\\.\\d{1,'+(dp||1)+'})?$').test(v))return'F';const x=+v;return x<lo||x>hi?'R':x}
/* INIT FUEL PRED (INIT B). Layout follows the FlyByWire A32NX MCDU (GPL-3.0). Units: tonnes. */
const at=(r,end,t,col,s)=>put(r,end-String(t).length+1,t,col,s);   /* right-aligned, last character at column end */
P.INITB={render(){const f=S.fuel,pr=predict(),B=BOX,D='---.-',T='----';
  put(1,5,'INIT FUEL PRED');put(1,22,'←');
  put(2,0,'TAXI','w','S');put(2,15,'ZFW/ZFWCG','w','S');
  put(3,0,f1(f.taxi??0.2),'b',f.taxi!=null?'L':'S');
  if(f.zfw!=null){at(3,17,f1(f.zfw),'b');put(3,18,'/','b');at(3,23,f1(f.cg),'b')}else{at(3,17,B+B+'.'+B,'a');put(3,18,'/','a');at(3,23,B+B+'.'+B,'a')}
  put(4,0,'TRIP','w','S');put(4,5,'/TIME','w','S');put(4,19,'BLOCK','w','S');
  at(5,4,pr?f1(pr.trip.fuel):D,pr?'g':'w',pr?'S':'L');put(5,5,'/','w');at(5,9,pr?hhmm(pr.trip.time):T,pr?'g':'w',pr?'S':'L');
  if(f.block!=null)at(5,23,f1(f.block),'b');else at(5,23,B+B+'.'+B,'a');
  put(6,0,'RTE RSV/%','w','S');
  at(7,4,pr?f1(pr.rsv):D,pr?'b':'w',pr&&f.rsv==null?'S':'L');put(7,5,'/','w');put(7,6,(pr?pr.pct:(f.rsvPct??5)).toFixed(1),'b',f.rsvPct!=null?'L':'S');
  put(8,0,'ALTN','w','S');put(8,5,'/TIME','w','S');put(8,15,'TOW/','w','S');put(8,22,'LW','w','S');
  at(9,4,pr?f1(pr.altn.fuel):D,pr?'b':'w',pr&&f.altn==null?'S':'L');put(9,5,'/','w');at(9,9,pr?hhmm(pr.altn.time):T,pr?'g':'w',pr?'S':'L');
  at(9,17,pr?f1(pr.tow):D,pr?'g':'w',pr?'S':'L');put(9,18,'/','w');at(9,23,pr?f1(pr.lw):D,pr?'g':'w',pr?'S':'L');
  put(10,0,'FINAL/TIME','w','S');put(10,15,'TRIP WIND','w','S');
  at(11,4,pr?f1(pr.final.fuel):D,pr?'b':'w',pr&&f.final==null?'S':'L');put(11,5,'/','w');
  at(11,9,hhmm(pr?pr.final.time:(f.finalTime??30)),'b',f.finalTime!=null?'L':'S');
  {const w=f.wind||0,sz=f.wind!=null?'L':'S';put(11,19,w<0?'HD':'TL','b',sz);put(11,21,String(Math.abs(w)).padStart(3,'0'),'b',sz)}
  put(12,0,'MIN DEST FOB','w','S');put(12,14,'EXTRA/TIME','w','S');
  at(13,4,pr?f1(pr.minFob):D,pr?'b':'w',pr&&f.minFob==null?'S':'L');
  {const neg=pr&&pr.extra.fuel<0,c=pr?(neg?'a':'g'):'w',sz=pr?'S':'L';at(13,18,pr?f1(pr.extra.fuel):D,c,sz);put(13,19,'/','w');at(13,23,pr?hhmm(Math.abs(pr.extra.time)):T,c,sz)}},
 lsk(s,n){const f=S.fuel,v=S.sp,k=s+n;if(!v)return;const C=v==='CLR';
  const chk=x=>x==='F'?(err('FORMAT ERROR'),false):x==='R'?(err('ENTRY OUT OF RANGE'),false):true;
  switch(k){
  case'L1':if(C){f.taxi=null;return ok()}{const x=num(v,0,9.9);if(!chk(x))return;f.taxi=x;return ok()}
  case'R1':{if(C)return err('NOT ALLOWED');const m=v.match(/^([\d.]*)(?:\/([\d.]*))?$/);if(!m||(!m[1]&&!m[2]))return err('FORMAT ERROR');
    let z=f.zfw,c=f.cg;if(m[1]){z=num(m[1],35,80);if(!chk(z))return}if(m[2]){c=num(m[2],8,50);if(!chk(c))return}
    if(z==null||c==null)return err('FORMAT ERROR');f.zfw=z;f.cg=c;return ok()}
  case'R2':{if(C)return err('NOT ALLOWED');const x=num(v,1,40);if(!chk(x))return;f.block=x;return ok()}
  case'L3':{if(C){f.rsv=null;f.rsvPct=null;return ok()}const m=v.match(/^([\d.]*)(?:\/([\d.]*))?$/);if(!m||(!m[1]&&!m[2]))return err('FORMAT ERROR');
    if(m[1]){const x=num(m[1],0,9.9);if(!chk(x))return;f.rsv=x;f.rsvPct=null}
    if(m[2]){const x=num(m[2],0,15);if(!chk(x))return;f.rsvPct=x;f.rsv=null}return ok()}
  case'L4':if(C){f.altn=null;return ok()}{const x=num(v,0,9.9);if(!chk(x))return;f.altn=x;return ok()}
  case'L5':{if(C){f.final=null;f.finalTime=null;return ok()}const m=v.match(/^([\d.]*)(?:\/(\d{4}))?$/);if(!m||(!m[1]&&!m[2]))return err('FORMAT ERROR');
    if(m[1]){const x=num(m[1],0,9.9);if(!chk(x))return;f.final=x;f.finalTime=null}
    if(m[2]){const t=+m[2].slice(0,2)*60+ +m[2].slice(2);if(+m[2].slice(2)>59||t>90)return err('ENTRY OUT OF RANGE');f.finalTime=t;f.final=null}return ok()}
  case'R5':{if(C){f.wind=null;return ok()}const m=v.match(/^(HD|TL|H|T|-|\+)?(\d{1,3})$/);if(!m)return err('FORMAT ERROR');
    const x=+m[2];if(x>250)return err('ENTRY OUT OF RANGE');f.wind=(m[1]&&/^(HD|H|-)$/.test(m[1]))?-x:x;return ok()}
  case'L6':if(C){f.minFob=null;return ok()}{const x=num(v,0,40);if(!chk(x))return;f.minFob=x;return ok()}
  case'R3':return err('NOT IN PROTOTYPE');
  default:return err('NOT ALLOWED')}}};

/* PERF TAKE OFF */
function orig(){const p=S.active;return p?p.legs[0].id:null}
function elevO(){const o=orig();return o?DB.apt[o].elev:0}
function defRed(){return Math.round((elevO()+1500)/10)*10}
/* PERF TAKE OFF. Layout follows the FlyByWire A32NX MCDU (GPL-3.0). */
P.PERFTO={render(){const q=S.perf,f=S.fuel,B=BOX,rw=S.active&&S.active.rwy;
  csegs(1,[['TAKE OFF RWY ',S.phase==='TAKEOFF'?'g':'w'],[(rw||'---').padStart(3),rw?'g':'w']]);
  put(2,1,'V1','w','S');put(2,5,'FLP RETR','w','S');
  put(4,1,'VR','w','S');put(4,5,'SLT RETR','w','S');rput(4,'TO SHIFT ','w','S');
  put(6,1,'V2','w','S');put(6,7,'CLEAN','w','S');rput(6,'FLAPS/THS','w','S');
  [[3,q.v1],[5,q.vr],[7,q.v2]].forEach(([r,x])=>x?put(r,0,String(x),'b'):put(r,0,B+B+B,'a'));
  const tow=f.zfw!=null&&f.block!=null?f.zfw+f.block-(f.taxi??0.2):null,cs=tow?charSpeeds(tow):null;
  [[3,'F',cs&&cs.F],[5,'S',cs&&cs.S],[7,'O',cs&&cs.O]].forEach(([r,l,x])=>{put(r,7,l+'=','w');put(r,9,x?String(x):'---',x?'g':'w')});
  if(q.shift!=null)segs(5,COLS-9,[['[M]','b','S'],[String(q.shift).padStart(5),'b'],['*','b']]);else segs(5,COLS-8,[['[M]','b','S'],['[  ]*','b']]);
  rput(7,q.flaps?q.flaps+'/'+(q.ths||'[   ]'):'[]/[   ]','b');
  put(8,0,'TRANS ALT','w','S');rput(8,'FLEX TO TEMP','w','S');
  const o=orig();put(9,0,String(q.ta??(o&&TA[o]||'[   ]')),'b',q.ta!=null?'L':'S');
  rput(9,q.flex!=null?q.flex+'°':'[  ]°','b');
  put(10,0,'THR RED/ACC','w','S');rput(10,'ENG OUT ACC','w','S');
  segs(11,0,[[String(q.thr??defRed()).padStart(5),'b',q.thr!=null?'L':'S'],['/','b'],[String(q.acc??defRed()).padEnd(5),'b',q.acc!=null?'L':'S']]);
  rput(11,String(q.eoacc??defRed()).padStart(5),'b',q.eoacc!=null?'L':'S');
  rput(12,'NEXT ','w','S');rput(13,'PHASE>')},
 lsk(s,n){const q=S.perf,v=S.sp,k=s+n;
  if(k==='R6')return err('NOT IN PROTOTYPE');if(!v)return;const C=v==='CLR';
  const vs=k==='L1'?'v1':k==='L2'?'vr':k==='L3'?'v2':null;
  if(vs){if(C){q[vs]=null;return ok()}if(!/^\d{2,3}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<90||x>350)return err('ENTRY OUT OF RANGE');
    q[vs]=x;ok();if(vDisagree())msg2('V1/VR/V2 DISAGREE',true,()=>!vDisagree());return}
  const minA=elevO()+400;
  switch(k){
  case'R1':return err('NOT ALLOWED');
  case'R2':{if(C){q.shift=null;return ok()}if(!/^\d{1,4}$/.test(v))return err('FORMAT ERROR');const p=S.active,rw=p&&p.rwy&&DB.apt[p.legs[0].id].rwy[p.rwy];
    if(!rw)return err('NOT ALLOWED');if(+v>=rw.len)return err('ENTRY OUT OF RANGE');q.shift=+v||null;return ok()}
  case'R3':{if(C){q.flaps=null;q.ths=null;return ok()}const m=v.match(/^([123])?(?:\/(?:(UP|DN)(\d(?:\.\d)?)|(\d(?:\.\d)?)(UP|DN)))?$/);
    if(!m||(!m[1]&&!m[2]&&!m[5]))return err('FORMAT ERROR');const dir=m[2]||m[5],val=m[3]||m[4];
    if(val!=null&&+val>5)return err('ENTRY OUT OF RANGE');if(m[1])q.flaps=+m[1];if(dir)q.ths=dir+(+val).toFixed(1);
    if(!q.flaps)return err('FORMAT ERROR');return ok()}
  case'R4':{if(C){q.flex=null;return ok()}if(!/^\d{1,2}$/.test(v))return err('FORMAT ERROR');q.flex=+v;return ok()}
  case'L4':{if(C){q.ta=null;return ok()}if(!/^\d{3,5}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<1000||x>39000)return err('ENTRY OUT OF RANGE');q.ta=Math.round(x/10)*10;return ok()}
  case'L5':{if(C){q.thr=q.acc=null;return ok()}const m=v.match(/^(\d{3,5})?(?:\/(\d{3,5}))?$/);if(!m||(!m[1]&&!m[2]))return err('FORMAT ERROR');
    const t=m[1]?+m[1]:(q.thr??defRed()),a=m[2]?+m[2]:Math.max(q.acc??defRed(),t);if(t<minA||a<minA||a<t||a>39000)return err('ENTRY OUT OF RANGE');
    if(m[1])q.thr=Math.round(t/10)*10;if(m[2]||a!==(q.acc??defRed()))q.acc=Math.round(a/10)*10;return ok()}
  case'R5':{if(C){q.eoacc=null;return ok()}if(!/^\d{3,5}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<minA||x>39000)return err('ENTRY OUT OF RANGE');q.eoacc=Math.round(x/10)*10;return ok()}
  default:return err('NOT ALLOWED')}}};
P.MENU={render(){cput(1,'MCDU MENU');rput(2,'SELECT ','w','S');put(3,0,'<FMGC','g');rput(3,'NAV B/UP>');put(5,0,'<ATSU');put(7,0,'<AIDS');put(9,0,'<CFDS');rput(13,'RETURN>')},
 lsk(s,n){if(s==='L'&&n===1||s==='R'&&n===6)return go('INIT');return err('NOT IN PROTOTYPE')}};
P.BLANK={render(){cput(1,S.title)},lsk(){return err('NOT IN PROTOTYPE')}};

/* ================= scratchpad messages =================
   Type I (S.msg): entry errors, shown over the scratchpad, which keeps its text; any key or CLR removes them.
   Type II (S.msgs): system messages, white or amber, kept in a list and shown while the scratchpad is empty
   (amber first, newest first); CLR removes the one shown, and each goes by itself once its condition is resolved.
   Message texts follow the FlyByWire A32NX NXSystemMessages (GPL-3.0). */
const vDisagree=()=>{const q=S.perf;return!!(q.v1&&q.vr&&q.v2&&!(q.v1<=q.vr&&q.vr<=q.v2))};
function msg2(t,amber,res){if(!S.msgs)S.msgs=[];if(S.msgs.some(m=>m.t===t))return;S.msgs.unshift({t,a:!!amber,res:res||null});S.msgs.sort((x,y)=>(y.a?1:0)-(x.a?1:0))}
const hasMsg=t=>!!(S.msgs&&S.msgs.some(m=>m.t===t));
function msgShown(){if(S.msg)return{t:S.msg,a:false};if(S.sp)return null;return S.msgs&&S.msgs[0]||null}
/* ================= input ================= */
function err(m){S.msg=m}
function ok(){S.sp='';S.msg=null}
function go(pg){S.page=pg;if(pg==='FPLN'){}}
function typeCh(ch){if(S.msg)S.msg=null;if(S.sp==='CLR')S.sp='';if(S.sp.length<22)S.sp+=ch}
function clrKey(){if(S.msg){S.msg=null;return}if(!S.sp&&S.msgs&&S.msgs.length){S.msgs.shift();return}if(S.sp==='CLR'){S.sp='';return}if(S.sp)S.sp=S.sp.slice(0,-1);else S.sp='CLR'}   /* CLR again clears CLR at once */
const TITLES={DIR:'DIR TO',PROG:'PROG',DATA:'DATA INDEX',RADNAV:'RADIO NAV',FUEL:'FUEL PRED',SECF:'SEC INDEX',ATC:'ATC MENU'};
function press(k){
  if(k.length===1&&/[A-Z0-9./]/.test(k))typeCh(k);
  else if(k==='SP')typeCh(' ');
  else if(k==='+/-'){if(S.msg)S.msg=null;if(S.sp.endsWith('-'))S.sp=S.sp.slice(0,-1)+'+';else if(S.sp.endsWith('+'))S.sp=S.sp.slice(0,-1)+'-';else typeCh('-')}
  else if(k==='CLR')clrKey();
  else if(k==='OVFY')err('NOT IN PROTOTYPE');
  else if(k==='INIT')go('INIT');
  else if(k==='FPLN'){go('FPLN')}
  else if(k==='MENU')go('MENU');
  else if(k==='AIRPORT'){go('FPLN');const p=cur();if(p){S.fpOff=Math.max(0,idxK(p,'dest')-1)}}
  else if(k==='UP'||k==='DOWN'){const pg=P[S.page];if(pg.slew)pg.slew(k==='UP'?1:-1)}
  else if(k==='LEFT'||k==='RIGHT'){if(S.page==='INIT')go('INITB');else if(S.page==='INITB')go('INIT')}
  else if(k==='PERF')go('PERFTO');
  else if(/^[LR][1-6]$/.test(k))P[S.page].lsk(k[0],+k[1]);
  else if(TITLES[k]){S.title=TITLES[k];go('BLANK');err('NOT IN PROTOTYPE')}
  render()}

/* ================= render ================= */
const SEC_PAGES=['FPLN','LATREV','DEP','ARR','AWY','VREV'];
const scr=$('#scr');
function takeoffRwyCheck(){const r=S.active&&S.active.rwy||null,q=S.perf;
  if(r!==q.rwyRef){if(q.rwyRef&&(q.v1||q.vr||q.v2)){q.v1=q.vr=q.v2=null;msg2('CHECK TAKE OFF DATA',true,()=>!!(S.perf.v1&&S.perf.vr&&S.perf.v2))}q.rwyRef=r}}
function render(){takeoffRwyCheck();if(typeof msgTick==='function')msgTick();if(S.msgs)S.msgs=S.msgs.filter(m=>!(m.res&&m.res()));clr();P[S.page].render();
  if(S.secMode&&SEC_PAGES.includes(S.page))for(const row of BUF)for(const x of row)if('gamy'.includes(x.c))x.c='w';   /* SEC F-PLN data is all white */
  {const m=msgShown();if(m)put(14,0,m.t,m.a?'a':'w');else put(14,0,S.sp,'w')}
  let h='';for(const row of BUF){h+='<div class="ln">';for(const x of row){
    const cl='c c-'+x.c+(x.s==='S'?' s':'');h+=x.ch===BOX?`<span class="${cl}"><i class="bx"></i></span>`:`<span class="${cl}">${x.ch==='<'?'&lt;':x.ch==='>'?'&gt;':x.ch==='&'?'&amp;':x.ch}</span>`}h+='</div>'}
  scr.innerHTML=h;if(window.drawND2D)drawND2D();tasks();if(window.__draw3D)window.__draw3D()}

/* keys overlay */
const mc=$('#mcdu');$('#mcduImg').src=IMG.mcdu;
const K=[];const LY=[139,182,227,271,318,364];
LY.forEach((y,i)=>{K.push(['L'+(i+1),8,y-16,54,y+16]);K.push(['R'+(i+1),510,y-16,556,y+16])});
const FX=[[66,125],[131,189],[196,254],[261,319],[327,385],[392,450]];
['DIR','PROG','PERF','INIT','DATA',null].forEach((k,i)=>k&&K.push([k,FX[i][0],444,FX[i][1],475]));
['FPLN','RADNAV','FUEL','SECF','ATC','MENU'].forEach((k,i)=>K.push([k,FX[i][0],488,FX[i][1],521]));
K.push(['AIRPORT',66,530,125,565],['LEFT',66,577,125,611],['UP',131,577,189,611],['RIGHT',66,622,125,655],['DOWN',131,622,189,655]);
const LX=[257,311,366,421,475],LYs=[571,623,677,731,787,842];
['ABCDE','FGHIJ','KLMNO','PQRST','UVWXY',['Z','/','SP','OVFY','CLR']].forEach((row,ri)=>(typeof row==='string'?row.split(''):row).forEach((k,ci)=>K.push([k,LX[ci]-22,LYs[ri]-20,LX[ci]+22,LYs[ri]+20])));
const NX=[93,148,203],NY=[701,748,796,844];
[['1','2','3'],['4','5','6'],['7','8','9'],['.','0','+/-']].forEach((row,ri)=>row.forEach((k,ci)=>K.push([k,NX[ci]-22,NY[ri]-22,NX[ci]+22,NY[ri]+22])));
for(const[k,x1,y1,x2,y2]of K){const b=document.createElement('button');b.className='k';b.type='button';b.setAttribute('aria-label',k);
  b.style.cssText=`left:${x1/5.63}%;top:${y1/8.8}%;width:${(x2-x1)/5.63}%;height:${(y2-y1)/8.8}%`;
  let t=null,long=false;
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('dn');long=false;if(k==='CLR')t=setTimeout(()=>{long=true;S.sp='';S.msg=null;render()},650)});
  const up=e=>{if(!b.classList.contains('dn'))return;b.classList.remove('dn');clearTimeout(t);if(e.type==='pointerup'&&!long)press(k)};
  b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up);
  mc.appendChild(b)}
new ResizeObserver(()=>{const h=scr.clientHeight/14,w=scr.clientWidth/24;const fl=Math.min(h*0.98,w/0.6*0.98);
  mc.style.setProperty('--fl',fl+'px');mc.style.setProperty('--fs',fl*0.74+'px')}).observe(mc);
document.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;if(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
  const v=$('#v-mcdu').classList.contains('on')||$('#modal').classList.contains('on');if(!v)return;
  let k=null;const c=e.key;
  if(/^[a-zA-Z0-9./]$/.test(c))k=c.toUpperCase();else if(c===' ')k='SP';else if(c==='-'||c==='+')k='+/-';else if(c==='Backspace'||c==='Delete')k='CLR';
  else if(c==='ArrowUp')k='UP';else if(c==='ArrowDown')k='DOWN';else if(c==='ArrowLeft')k='LEFT';else if(c==='ArrowRight')k='RIGHT';
  if(k){e.preventDefault();press(k)}});

