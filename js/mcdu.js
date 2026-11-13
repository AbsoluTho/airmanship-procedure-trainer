'use strict';
/* ================= state ================= */
let S;
function freshState(){return{page:'INIT',title:'',sp:'',msg:null,
  init:{from:null,to:null,altn:null,flt:null,ci:null,crz:null,temp:null,tropo:null,gnd:null},
  active:null,tmpy:null,fpOff:0,lr:0,dep:{list:'RWY',off:0},arr:{list:'APPR',off:0},awy:null,
  fuel:{zfw:null,cg:null,block:null,taxi:null,rsv:null,rsvPct:null,altn:null,final:null,finalTime:null,wind:null,minFob:null},
  perf:{v1:null,vr:null,v2:null,shift:null,flaps:null,ths:null,flex:null,ta:null,thr:null,acc:null,eoacc:null,rwyRef:null},
  elec:{bat1:false,bat2:false,ext:false,apu:false}}}
S=freshState();
const I=()=>S.init;
const clone=o=>JSON.parse(JSON.stringify(o));
const cur=()=>S.tmpy||S.active;
function edit(){if(!S.tmpy)S.tmpy=clone(S.active);return S.tmpy}
function newPlan(f,t){return{rwy:null,sid:null,trans:null,appr:null,via:null,star:null,legs:[{k:'orig',id:f},{k:'disc'},{k:'dest',id:t}]}}
function idxK(p,k){return p.legs.findIndex(l=>l.k===k)}
function normalize(p){const L=p.legs;let ch=true;
  while(ch){ch=false;
    for(let i=0;i<L.length-1;i++){const a=L[i],b=L[i+1],c=L[i+2];
      if(a.k==='disc'&&b.k==='disc'){L.splice(i,1);ch=true;break}
      if(a.k==='wpt'&&b.k==='wpt'&&a.id===b.id){L.splice(i,1);ch=true;break}
      if(c&&a.k==='wpt'&&b.k==='disc'&&c.k==='wpt'&&a.id===c.id){L.splice(i,2);ch=true;break}}}}
function dropSeg(p,...segs){p.legs=p.legs.filter(l=>!segs.includes(l.seg))}
function setRunway(p,r){p.rwy=r;p.legs[0].rwy=r;dropSeg(p,'dep');p.sid=null;p.trans=null;if(p.legs[1].k!=='disc')p.legs.splice(1,0,{k:'disc'});normalize(p)}
function setSid(p,sid){dropSeg(p,'dep');const legs=clone(SIDS[p.legs[0].id][p.rwy][sid]).map(l=>Object.assign(l,{seg:'dep',via:sid}));
  p.legs.splice(1,0,...legs);const nx=p.legs[1+legs.length],last=legs[legs.length-1];
  if(nx&&nx.k!=='disc'&&!(nx.k==='wpt'&&nx.id===last.id))p.legs.splice(1+legs.length,0,{k:'disc'});
  p.sid=sid;p.trans=null;normalize(p)}
function buildArr(p){dropSeg(p,'arr','map');const di=idxK(p,'dest'),d=p.legs[di];const ap=APPRS[d.id][p.appr];
  const via=p.via&&ap.vias[p.via]?clone(ap.vias[p.via]).map(l=>Object.assign(l,{seg:'arr',via:p.via})):[];
  const fin=clone(ap.final).map(l=>Object.assign(l,{seg:'arr',via:p.appr}));const legs=[...via,...fin];
  d.rwy=ap.rwy;d.lbl=ap.dest.lbl;d.alt=ap.dest.alt;d.via=p.appr;
  p.legs.splice(di,0,...legs);const pv=p.legs[di-1];
  if(pv.k!=='disc'&&!(pv.k==='wpt'&&pv.id===legs[0].id))p.legs.splice(di,0,{k:'disc'});
  const d2=idxK(p,'dest');p.legs.splice(d2+1,0,...clone(ap.missed).map(l=>Object.assign(l,{seg:'map',via:''})));normalize(p)}
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
function legPos(l){if(l.k==='wpt')return DB.wpt[l.id];
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
function tmpyFoot(){if(S.tmpy){put(12,1,'TMPY','y','S');rput(12,'TMPY','y','S',23);put(13,0,'←ERASE','a');rput(13,'INSERT*','a');return true}return false}

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
    if(!/^[A-Z]{4}$/.test(v))return err('FORMAT ERROR');if(!DB.apt[v])return err('NOT IN DATA BASE');i.altn=v;return ok();
  case'L3':if(!/^[A-Z0-9]{1,8}$/.test(v))return err('FORMAT ERROR');i.flt=v;return ok();
  case'L5':if(!/^\d{1,3}$/.test(v))return err('FORMAT ERROR');i.ci=+v;return ok();
  case'L6':{const m=v.match(/^(?:FL)?(\d{1,3})?(?:\/([+-]?\d{1,2}))?$/);if(!m||(!m[1]&&m[2]==null))return err('FORMAT ERROR');
    if(m[1]){const fl=+m[1];if(fl<10||fl>398)return err('ENTRY OUT OF RANGE');i.crz=fl;if(m[2]==null)i.temp=null}
    if(m[2]!=null){if(!i.crz)return err('NOT ALLOWED');i.temp=/^[+-]/.test(m[2])?+m[2]:-m[2]}return ok()}
  case'R5':{if(!/^\d{1,5}$/.test(v))return err('FORMAT ERROR');const tp=v.length<=3?+v*100:+v;if(tp<1000||tp>60000)return err('ENTRY OUT OF RANGE');i.tropo=tp;return ok()}
  case'R6':if(!/^[+-]?\d{1,2}$/.test(v))return err('FORMAT ERROR');i.gnd=+v;return ok();
  default:return err('NOT ALLOWED')}}};

function fplnRows(p){const rows=p?p.legs.map((l,ix)=>Object.assign({},l,{ix})):[];
  rows.push({k:'end',t:'END OF F-PLN'});
  if(I().altn&&p){rows.push({k:'altn',id:I().altn});rows.push({k:'end',t:'END OF ALTN F-PLN'})}else rows.push({k:'end',t:'NO ALTN F-PLN'});
  return rows}
const dash=t=>{const n=COLS-t.length,a=Math.floor(n/2);return'-'.repeat(a)+t+'-'.repeat(n-a)};
function planCentre(p){const rows=fplnRows(p);for(let j=Math.min(S.fpOff+1,rows.length-1);j>=0;j--){const r=rows[j];
  const pos=(r.k==='altn')?DB.apt[r.id].pos:(r.k&&r.k!=='end'&&r.k!=='disc')?legPos(r):null;if(pos)return{pos,id:r.id}}return null}
P.FPLN={render(){const p=cur(),rows=fplnRows(p),ds=p?dists(p):[];
  if(p){const c=planCentre(p);if(c)EFIS.ctr=c}
  const pr=predict(),tcum=pr&&p===S.active?pr.cum:null;
  put(1,1,'FROM','w','S');if(S.tmpy)put(1,6,'TMPY','y');if(I().flt)rput(1,I().flt,'w','L',23);
  const base=S.tmpy?'y':'g';let firstD=true;
  for(let n=0;n<5;n++){const r=rows[S.fpOff+n];if(!r)break;const ln=3+2*n,lb=ln-1;
    if(n===0){put(lb,8,'TIME','w','S');rput(lb,'SPD/ALT','w','S',22)}
    if(r.k==='end'){put(ln,0,dash(r.t),'w');continue}
    if(r.k==='disc'){put(ln,0,dash('F-PLN DISCONTINUITY'),'w');continue}
    const col=r.k==='altn'||r.seg==='map'?'b':base;
    if(n>0&&r.k!=='altn'){put(lb,1,(r.via||'').slice(0,6),'w','S');if(r.lbl)put(lb,8,r.lbl,'w','S');
      const d=ds[r.ix];if(d!=null){const t=String(Math.round(d));if(firstD){rput(lb,t+'NM','w','S',21);firstD=false}else rput(lb,t,'w','S',19)}}
    const id=(r.k==='orig'||r.k==='dest')?r.id+(r.rwy||''):r.id;
    const tm=tcum&&r.k!=='altn'&&tcum[r.ix]!=null?hhmm(pr.trip.at(tcum[r.ix])+(r.k==='orig'?0:1)):null;
    put(ln,0,id.slice(0,7),col);if(tm)put(ln,8,tm,col);else put(ln,8,'----','w');
    if(r.k==='orig'){rput(ln,'---/'+String(DB.apt[r.id].elev).padStart(6),col)}
    else{const sp=r.spd?String(r.spd):'---',al=r.alt?fAlt(r.alt):'-----';
      const st=24-(4+1+6);put(ln,st,sp.padStart(4),r.spd?'m':'w');put(ln,st+4,'/','w');put(ln,st+5,al.padStart(6),r.alt?'m':'w')}}
  if(!tmpyFoot()&&p){const di=idxK(p,'dest'),d=p.legs[di];
    let tot=0;ds.forEach((x,ix)=>{if(ix<=di&&x)tot+=x});
    put(12,1,'DEST','w','S');put(12,8,'TIME','w','S');rput(12,'DIST','w','S',17);rput(12,'EFOB','w','S',24);
    put(13,0,(d.id+(d.rwy||'')).slice(0,7),'g');rput(13,String(Math.round(tot)),'g','L',17);
    if(pr){put(13,8,hhmm(pr.trip.time),'g');rput(13,f1(S.fuel.block-pr.taxi-pr.trip.fuel),'g')}else{put(13,8,'----','w');rput(13,'----','w')}}},
 lsk(s,n){const p=cur();if(!p)return err('NOT ALLOWED');
  if(n===6){if(S.tmpy){if(s==='L')S.tmpy=null;else{S.active=S.tmpy;S.tmpy=null}return ok()}
    if(s==='L'){S.lr=idxK(p,'dest');return go('LATREV')}return err('NOT IN PROTOTYPE')}
  const r=fplnRows(p)[S.fpOff+n-1];if(!r)return;
  if(s==='R')return err('NOT IN PROTOTYPE');
  if(r.k==='end'||r.k==='altn')return err('NOT ALLOWED');
  const v=S.sp;
  if(v==='CLR'){if(r.k==='orig'||r.k==='dest')return err('NOT ALLOWED');const q=edit();
    if(r.k==='disc')q.legs.splice(r.ix,1);else q.legs.splice(r.ix,1,{k:'disc'});normalize(q);return ok()}
  if(v){if(r.k==='orig')return err('NOT ALLOWED');if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');
    if(!DB.wpt[v])return err('NOT IN DATA BASE');insertWpt(edit(),r.ix,v,false);return ok()}
  if(r.k!=='orig'&&r.k!=='wpt'&&r.k!=='dest')return err('NOT ALLOWED');
  S.lr=r.ix;go('LATREV')},
 slew(d){const p=cur();const n=fplnRows(p).length;S.fpOff=Math.max(0,Math.min(n-1,S.fpOff+d))}};

P.LATREV={render(){const p=cur(),l=p.legs[S.lr];
  csegs(1,[['LAT REV','w'],[' FROM ','w','S'],[l.id,'g']]);
  const pos=legPos(l);if(pos)cput(2,fmtLL(pos),'g','S');
  if(l.k==='orig'){put(3,0,'<DEPARTURE');rput(3,'FIX INFO>')}
  else if(l.k==='dest'){rput(3,'ARRIVAL>');put(7,0,'<ALTN');rput(4,'LL XING/INCR/NO','w','S',23);rput(5,'[  ]°/[ ]°/[]','b')}
  else{rput(3,'FIX INFO>');put(5,0,'<OFFSET');rput(4,'LL XING/INCR/NO','w','S',23);rput(5,'[  ]°/[ ]°/[]','b');
    put(7,0,'<HOLD');rput(6,'NEXT WPT','w','S',23);rput(7,'[    ]','b');rput(8,'NEW DEST','w','S',23);rput(9,'[   ]','b');rput(11,'AIRWAYS>')}
  if(l.k==='orig'){rput(6,'NEXT WPT','w','S',23);rput(7,'[    ]','b');rput(8,'NEW DEST','w','S',23);rput(9,'[   ]','b')}
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),l=p.legs[S.lr],k=s+n;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  if(k==='L1'&&l.k==='orig'){S.dep={list:p.rwy?'SID':'RWY',off:0};return go('DEP')}
  if(k==='R1'&&l.k==='dest'){S.arr={list:p.appr?'VIA':'APPR',off:0};return go('ARR')}
  if(k==='R3'&&l.k!=='dest'){const v=S.sp;if(!v)return;if(!/^[A-Z0-9]{2,5}$/.test(v))return err('FORMAT ERROR');
    if(!DB.wpt[v])return err('NOT IN DATA BASE');insertWpt(edit(),S.lr,v,true);ok();return go('FPLN')}
  if(k==='R5'&&l.k==='wpt'){S.awy={idx:S.lr,rows:[]};return go('AWY')}
  return err('NOT IN PROTOTYPE')}};

P.DEP={items(){const p=cur(),o=p.legs[0],ap=DB.apt[o.id];
  if(S.dep.list==='RWY')return Object.entries(ap.rwy).map(([id,r])=>({id,txt:('<'+id).padEnd(6)+(r.len+'M').padStart(6)+'  CRS'+r.crs}));
  if(S.dep.list==='SID'){const t=(SIDS[o.id]||{})[p.rwy];return t?Object.keys(t).map(id=>({id,txt:'<'+id})):[{id:null,txt:'<NO SID'}]}
  return[{id:'NONE',txt:'<NO TRANS'}]},
 render(){const p=cur(),o=p.legs[0],c=S.tmpy?'y':'g';
  csegs(1,[['DEPARTURES','w'],[' FROM ','w','S'],[o.id,'g']]);
  put(2,1,'RWY','w','S');put(2,9,'SID','w','S');put(2,17,'TRANS','w','S');
  put(3,1,p.rwy||'---',p.rwy?c:'w');put(3,9,p.sid||'------',p.sid?c:'w');put(3,17,p.sid?(p.trans||'------'):'------',p.trans?c:'w');
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
    else if(S.dep.list==='SID'){setSid(edit(),x.id);S.dep={list:'TRANS',off:0}}
    else{edit().trans='NONE'}return}
  return err('NOT ALLOWED')},
 slew(d){const n=this.items().length;S.dep.off=Math.max(0,Math.min(Math.max(0,n-4),S.dep.off-d))}};

P.ARR={items(){const p=cur(),d=p.legs[idxK(p,'dest')],t=APPRS[d.id]||{};
  if(S.arr.list==='APPR'){const k=Object.keys(t);return k.length?k.map(id=>({id,txt:('<'+id).padEnd(8)+(t[id]?'CRS'+t[id].crs+' '+t[id].nav:'')})):[{id:null,txt:'<NO APPR'}]}
  if(S.arr.list==='VIA'){const ap=t[p.appr];return[{id:'NO VIA',txt:'<NO VIA'},...Object.keys(ap.vias).map(id=>({id,txt:'<'+id}))]}
  return[{id:'NO STAR',txt:'<NO STAR'}]},
 render(){const p=cur(),d=p.legs[idxK(p,'dest')],c=S.tmpy?'y':'g';
  csegs(1,[['ARRIVAL','w'],[' TO ','w','S'],[d.id,'g']]);
  put(2,1,'APPR','w','S');put(2,10,'VIA','w','S');
  put(3,1,p.appr||'------',p.appr?c:'w');put(3,10,p.appr?(p.via||'NO VIA'):'------',p.appr?c:'w');
  put(4,1,'STAR','w','S');put(4,10,'TRANS','w','S');
  put(5,1,p.star||'------',p.star?c:'w');put(5,10,'------','w');
  cput(6,{APPR:'APPROACHES',VIA:'APPR VIAS',STAR:'STARS'}[S.arr.list],'w','S');
  const it=this.items();for(let n=0;n<3;n++){const x=it[S.arr.off+n];if(x)put(7+2*n,0,x.txt,'b')}
  if(!tmpyFoot())put(13,0,'<RETURN')},
 lsk(s,n){const p=cur(),k=s+n;
  if(k==='L6'){if(S.tmpy)S.tmpy=null;S.page='FPLN';return ok()}
  if(k==='R6'){if(S.tmpy){S.active=S.tmpy;S.tmpy=null;S.page='FPLN';return ok()}return}
  if(k==='L1'){S.arr={list:'APPR',off:0};return}
  if(k==='R1'){if(!p.appr)return err('NOT ALLOWED');S.arr={list:'VIA',off:0};return}
  if(k==='L2'){S.arr={list:'STAR',off:0};return}
  if(s==='L'&&n>=3&&n<=5){const x=this.items()[S.arr.off+n-3];if(!x)return;if(!x.id)return err('NOT ALLOWED');
    if(S.arr.list==='APPR'){const d=p.legs[idxK(p,'dest')];if(!APPRS[d.id][x.id])return err('NOT IN DATA BASE');
      const q=edit();q.appr=x.id;q.via=null;q.star=null;buildArr(q);S.arr={list:'VIA',off:0}}
    else if(S.arr.list==='VIA'){const q=edit();q.via=x.id==='NO VIA'?null:x.id;buildArr(q);S.arr={list:'STAR',off:0}}
    else{edit().star='NO STAR'}return}
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
P.INITB={render(){const f=S.fuel,pr=predict(),B=BOX;
  cput(1,'INIT');put(1,22,'←');
  put(2,1,'TAXI','w','S');rput(2,'ZFW/ZFWCG','w','S',23);
  put(3,0,f1(f.taxi??0.2),'b',f.taxi!=null?'L':'S');
  if(f.zfw!=null)rput(3,f1(f.zfw)+'/'+f1(f.cg),'b');else rput(3,B+B+'.'+B+'/'+B+B+'.'+B,'a');
  put(4,1,'TRIP /TIME','w','S');rput(4,'BLOCK','w','S',23);
  put(5,0,pr?f1(pr.trip.fuel)+'/'+hhmm(pr.trip.time):dashF,pr?'g':'w');
  if(f.block!=null)rput(5,f1(f.block),'b');else rput(5,B+B+'.'+B,'a');
  put(6,1,'RTE RSV/%','w','S');
  segs(7,0,[[pr?f1(pr.rsv):'---.-','b',f.rsv!=null?'L':'S'],['/','b'],[(pr?pr.pct:(f.rsvPct??5)).toFixed(1),'b',f.rsvPct!=null?'L':'S']]);
  put(8,1,'ALTN /TIME','w','S');rput(8,'TOW/   LW','w','S',23);
  if(pr)segs(9,0,[[f1(pr.altn.fuel),'b',f.altn!=null?'L':'S'],['/'+hhmm(pr.altn.time),'g']]);else put(9,0,dashF,'w');
  rput(9,pr?f1(pr.tow)+'/'+f1(pr.lw):'---.-/---.-',pr?'g':'w');
  put(10,1,'FINAL/TIME','w','S');rput(10,'TRIP WIND','w','S',23);
  if(pr)segs(11,0,[[f1(pr.final.fuel),'b',f.final!=null?'L':'S'],['/','b'],[hhmm(pr.final.time),'b',f.finalTime!=null?'L':'S']]);
  else segs(11,0,[['---.-/','w'],[hhmm(f.finalTime??30),'b','S']]);
  const w=f.wind||0;rput(11,(w<0?'HD':'TL')+String(Math.abs(w)).padStart(3,'0'),'b',f.wind!=null?'L':'S');
  put(12,0,'EXTRA/TIME','w','S');rput(12,'MIN DEST FOB','w','S',23);
  put(13,0,pr?f1(pr.extra.fuel)+'/'+hhmm(Math.abs(pr.extra.time)):dashF,pr?(pr.extra.fuel<0?'a':'g'):'w');
  rput(13,pr?f1(pr.minFob):'---.-',pr?'b':'w',f.minFob!=null?'L':'S')},
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
  case'R6':if(C){f.minFob=null;return ok()}{const x=num(v,0,40);if(!chk(x))return;f.minFob=x;return ok()}
  case'R3':return err('NOT IN PROTOTYPE');
  default:return err('NOT ALLOWED')}}};

/* PERF TAKE OFF */
function orig(){const p=S.active;return p?p.legs[0].id:null}
function elevO(){const o=orig();return o?DB.apt[o].elev:0}
function defRed(){return Math.round((elevO()+1500)/10)*10}
P.PERFTO={render(){const q=S.perf,pr=predict(),f=S.fuel,B=BOX;
  cput(1,'TAKE OFF');
  put(2,1,'V1','w','S');put(2,7,'FLP RETR','w','S');rput(2,'RWY','w','S',23);
  put(4,1,'VR','w','S');put(4,7,'SLT RETR','w','S');rput(4,'TO SHIFT','w','S',23);
  put(6,1,'V2','w','S');put(6,7,'CLEAN','w','S');rput(6,'FLAPS/THS','w','S',23);
  [[3,q.v1],[5,q.vr],[7,q.v2]].forEach(([r,x])=>x?put(r,0,String(x),'b'):put(r,0,B+B+B,'a'));
  const tow=f.zfw!=null&&f.block!=null?f.zfw+f.block-(f.taxi??0.2):null,cs=tow?charSpeeds(tow):null;
  [[3,'F',cs&&cs.F],[5,'S',cs&&cs.S],[7,'O',cs&&cs.O]].forEach(([r,l,x])=>{put(r,7,l+'=','w');put(r,9,x?String(x):'---',x?'g':'w')});
  const rw=S.active&&S.active.rwy;rput(3,rw||'---',rw?'g':'w');
  if(q.shift!=null)segs(5,24-9,[['[M]','b','S'],[String(q.shift).padStart(5),'b'],['*','b']]);else rput(5,'[M][   ]*','b');
  if(q.flaps)rput(7,q.flaps+'/'+(q.ths?q.ths:'[   ]'),'b');else rput(7,'[]/[   ]','b');
  put(8,1,'TRANS ALT','w','S');rput(8,'FLEX TO TEMP','w','S',23);
  const o=orig();put(9,0,String(q.ta??(o&&TA[o]||'-----')),'b',q.ta!=null?'L':'S');
  rput(9,q.flex!=null?q.flex+'°':'[  ]°','b');
  put(10,0,'THR RED/ACC','w','S');rput(10,'ENG OUT ACC','w','S',23);
  segs(11,0,[[String(q.thr??defRed()),'b',q.thr!=null?'L':'S'],['/','b'],[String(q.acc??defRed()),'b',q.acc!=null?'L':'S']]);
  rput(11,String(q.eoacc??defRed()),'b',q.eoacc!=null?'L':'S');
  rput(12,'NEXT ','w','S',23);rput(13,'PHASE>')},
 lsk(s,n){const q=S.perf,v=S.sp,k=s+n;
  if(k==='R6')return err('NOT IN PROTOTYPE');if(!v)return;const C=v==='CLR';
  const vs=k==='L1'?'v1':k==='L2'?'vr':k==='L3'?'v2':null;
  if(vs){if(C){q[vs]=null;return ok()}if(!/^\d{2,3}$/.test(v))return err('FORMAT ERROR');const x=+v;if(x<90||x>350)return err('ENTRY OUT OF RANGE');
    q[vs]=x;ok();if(q.v1&&q.vr&&q.v2&&!(q.v1<=q.vr&&q.vr<=q.v2))S.msg='V1/VR/V2 DISAGREE';return}
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

/* ================= input ================= */
function err(m){S.msg=m}
function ok(){S.sp='';S.msg=null}
function go(pg){S.page=pg;if(pg==='FPLN'){}}
function typeCh(ch){if(S.msg)S.msg=null;if(S.sp==='CLR')S.sp='';if(S.sp.length<22)S.sp+=ch}
function clrKey(){if(S.msg){S.msg=null;return}if(S.sp)S.sp=S.sp.slice(0,-1);else S.sp='CLR'}
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
const scr=$('#scr');
function takeoffRwyCheck(){const r=S.active&&S.active.rwy||null,q=S.perf;
  if(r!==q.rwyRef){if(q.rwyRef&&(q.v1||q.vr||q.v2)){q.v1=q.vr=q.v2=null;S.msg='CHECK TAKE OFF DATA'}q.rwyRef=r}}
function render(){takeoffRwyCheck();clr();P[S.page].render();
  if(S.msg)put(14,0,S.msg,'w');else put(14,0,S.sp,'w');
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

