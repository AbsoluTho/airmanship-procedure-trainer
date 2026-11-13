'use strict';
/* ================= ND (navigation display) =================
   ROSE NAV, ARC and PLAN drawn from the active and temporary flight plans.
   Drawn on a 768 x 768 design grid, scaled to whatever canvas it is given. */
const EFIS={mode:'ARC',range:10,cstr:false,wpt:false,vord:false,ndb:false,arpt:false,ctr:null,fd:true,ls:false,baro:1013,std:false,inhg:false,nav1:'OFF',nav2:'OFF'};
const baroHpa=()=>EFIS.baro;
/* actual QNH: 1013 near the departure, the PERF APPR QNH (hPa) near the destination when it was entered */
function actualQnh(){const q=S.p2&&S.p2.qnh;return flying()&&FL.path&&FL.s>FL.path.sThr/2&&typeof q==='number'?q:1013}
/* VOR/ADF stations: manual RAD NAV tuning, otherwise the nearest station is autotuned */
function navStation(n){const r=S.rad||{},sw=EFIS['nav'+n];if(sw==='OFF')return null;const ac=acState().pos,isA=sw==='ADF';
  const man=isA?r['adf'+n]:r['vor'+n];if(man&&man.id&&DB.nav[man.id])return{id:man.id,...DB.nav[man.id],adf:isA};
  const list=Object.entries(DB.nav||{}).filter(([,x])=>isA?/NDB/.test(x.type):/VOR|TACAN/.test(x.type)).map(([id,x])=>({id,...x,d:gc(ac,x.pos),adf:isA})).sort((a,b)=>a.d-b.d);
  const st=list[n===1?0:1];return st&&st.d<200?st:null}
const MODES=['LS','VOR','NAV','ARC','PLAN'];
const EFIS_OPTS=['cstr','wpt','vord','ndb','arpt'];
const RANGES=[10,20,40,80,160,320];
const NC={g:'#3df24e',w:'#ffffff',b:'#3fd2ff',y:'#fff23d',m:'#ff6cf6',a:'#ffa21f',ac:'#ffe600',dim:'#8a949c'};
const NF=(px,w)=>`${w||500} ${px}px "Helvetica Neue",Helvetica,Arial,sans-serif`;

/* aircraft on the ground: at the threshold of the F-PLN runway, else at the airport */
function acState(){if(flying())return{pos:FL.pos,hdg:(FL.hdgT-(DB.apt[orig()].var||3)+360)%360,vr:DB.apt[orig()].var||3};const p=S.active,o=p?p.legs[0].id:'OEJN',ap=DB.apt[o]||DB.apt.OEJN;
  const r=p&&p.rwy&&ap.rwy[p.rwy];return{pos:r?r.pos:ap.pos,hdg:r?r.crs:156,vr:ap.var||0}}
function toWpt(){const p=S.active;if(!p)return null;const from=flying()?FL.fromIx:0;const l=p.legs.find((x,i)=>i>Math.max(0,from)&&(x.k==='wpt'||x.k==='dest'));if(l&&l.k==='dest')return{id:l.id+(l.rwy||''),pos:legPos(l)};return l?{id:l.id,pos:DB.wpt[l.id]}:null}

/* ---------- flight-plan geometry (lat/lon polylines) ---------- */
function arcPts(a,b,c){const r=gc(c,a),b1=brg(c,a);let d=((brg(c,b)-b1+540)%360)-180;const n=Math.max(4,Math.ceil(Math.abs(d)/4)),out=[];
  for(let i=0;i<=n;i++)out.push(dst(c,b1+d*i/n,r));return out}
function holdPts(F,crsT,right){const L=3.5,rt=1.5,t=crsT*D2R,sg=right?1:-1;
  const u=[Math.sin(t),Math.cos(t)],v=[Math.cos(t)*sg,-Math.sin(t)*sg];
  const P=(x,y)=>[F[0]+y/60,F[1]+x/(60*Math.cos(F[0]*D2R))],pts=[];
  const add=(cx,cy,f)=>{for(let i=0;i<=12;i++){const a=Math.PI*i/12,[e,n]=f(a);pts.push(P(cx+e,cy+n))}};
  pts.push(P(-L*u[0],-L*u[1]));
  add(rt*v[0],rt*v[1],a=>[rt*(-Math.cos(a)*v[0]+Math.sin(a)*u[0]),rt*(-Math.cos(a)*v[1]+Math.sin(a)*u[1])]);
  add(rt*v[0]-L*u[0],rt*v[1]-L*u[1],a=>[rt*(Math.cos(a)*v[0]-Math.sin(a)*u[0]),rt*(Math.cos(a)*v[1]-Math.sin(a)*u[1])]);
  return pts}
function planGeo(p,base){const G={lines:[],wpts:[],rwys:[]};let prev=null,vr=0;
  const crs=t=>{const m=String(t||'').match(/(\d{3})/);return m?+m[1]:null};
  p.legs.forEach((l,ix)=>{const col=l.seg==='map'?'b':base;
    if(l.k==='orig'||l.k==='dest'){const ap=DB.apt[l.id],r=l.rwy&&ap.rwy[l.rwy],pos=r?r.pos:ap.pos;vr=ap.var||0;
      if(l.k==='dest'&&prev)G.lines.push({pts:[prev,pos],col,ix});
      G.rwys.push({id:l.id,rwy:l.rwy,pos,crsT:r?r.crs+vr:null,len:r?r.len/1852:0});prev=pos;return}
    if(l.k==='wpt'){const pos=DB.wpt[l.id];if(!pos){prev=null;return}
      if(prev)G.lines.push({pts:l.lbl==='ARC'&&l.ctr&&DB.wpt[l.ctr]?arcPts(prev,pos,DB.wpt[l.ctr]):[prev,pos],col,ix});
      G.wpts.push({id:l.id,pos,col,alt:l.alt,spd:l.spd,ix});prev=pos;return}
    if(l.k==='tp'){prev=l.pos;return}
    if(l.k==='ca'&&prev){const o=p.legs[0],ap=DB.apt[o.id],r=ap.rwy[o.rwy];if(!r){prev=null;return}
      const q=dst(r.pos,r.crs+vr,r.len/1852+l.aal/320);G.lines.push({pts:[prev,q],col});prev=q;return}
    if(l.k==='hdg'&&prev){const c=crs(l.lbl);if(c==null){prev=null;return}const q=dst(prev,c+vr,5);G.lines.push({pts:[prev,q],col});prev=q;return}
    if(l.k==='hold'&&prev&&l.fix){G.lines.push({pts:holdLoop(prev,l.crs+vr,l.turn!=='L',holdLen(l),HOLD_R),col,ix});return}   /* pilot-entered hold */
    if(l.k==='hold'&&prev){const c=crs(l.lbl);if(c!=null)G.lines.push({pts:holdPts(prev,c+vr,/R$/.test(l.id)),col});return}
    prev=null});
  return G}

/* ---------- projection ----------
   Design grid is 768 wide; its height follows the screen (the ND screen in the panel photo is 395 x 416). */
function ndView(Hg){const ac=acState(),m=EFIS.mode,hT=ac.hdg+ac.vr;
  if(m==='ARC')return{m,ac,cx:385,cy:Hg-156,R:519,nm:EFIS.range,ctr:ac.pos,rot:hT,map:true};
  const cy=Math.round(Hg/2)+14;
  return{m,ac,cx:384,cy,R:282,nm:EFIS.range/2,ctr:m==='PLAN'&&EFIS.ctr?EFIS.ctr.pos:ac.pos,rot:m==='PLAN'?0:hT,map:m!=='LS'&&m!=='VOR'}}
function projF(V){const k=V.R/V.nm;return pos=>{const d=gc(V.ctr,pos);if(d<1e-6)return[V.cx,V.cy];const b=(brg(V.ctr,pos)-V.rot)*D2R;
  return[V.cx+d*k*Math.sin(b),V.cy-d*k*Math.cos(b)]}}

/* ---------- drawing ---------- */
function drawND(g,W,H,powered){g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,W,H);
  if(!powered){g.restore();return}
  const sc=W/768,Hg=H/sc;g.scale(sc,sc);const V=ndView(Hg),pj=projF(V),ac=V.ac,hdg=ac.hdg;g.lineCap='butt';g.lineJoin='round';
  const A=S.active,T=S.tmpy,to=toWpt(),inPlan=new Set();
  const label=(t,x,y,col,px,al)=>{g.font=NF(px||22);g.fillStyle=NC[col];g.textAlign=al||'left';g.textBaseline='middle';g.fillText(t,x,y)};
  if(V.map){
  g.save();g.beginPath();
  if(V.m==='PLAN'){/* PLAN: the map uses the whole screen outside the data fields (FlyByWire PlanModeUnderlay clip) */
    const ky=Hg/768;[[45,112],[140,112],[280,56],[488,56],[628,112],[723,112],[723,720],[114,720],[114,633],[45,633]].forEach(([x,y],i)=>i?g.lineTo(x,y*ky):g.moveTo(x,y*ky));g.closePath()}
  else g.arc(V.cx,V.cy,V.R,0,Math.PI*2);
  g.clip();const inMap=(x,y,m)=>V.m==='PLAN'?(x>-40&&x<808&&y>-40&&y<Hg+40):Math.hypot(x-V.cx,y-V.cy)<=V.R+(m||0);
  const line=(pts,col,dash,w)=>{g.strokeStyle=NC[col];g.lineWidth=w||3.5;g.setLineDash(dash||[]);g.beginPath();pts.forEach((p,i)=>{const[x,y]=pj(p);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();g.setLineDash([])};
  const diamond=(x,y,col,s)=>{g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s,y);g.lineTo(x,y+s);g.lineTo(x-s,y);g.closePath();g.strokeStyle=NC[col];g.lineWidth=3;g.stroke()};
  const star=(x,y,col)=>{g.strokeStyle=NC[col];g.lineWidth=3;g.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/4;g.moveTo(x-11*Math.cos(a),y-11*Math.sin(a));g.lineTo(x+11*Math.cos(a),y+11*Math.sin(a))}g.stroke()};
  const geos=[];if(A)geos.push([planGeo(A,'g'),false]);if(T)geos.push([planGeo(T,'y'),true]);if(S.secMode&&S.sec)geos.push([planGeo(S.sec,'w'),'sec']);
  if(A&&I().altn&&DB.apt[I().altn]){const d=A.legs[idxK(A,'dest')],dp=legPos(d),ap=DB.apt[I().altn].pos;line([dp,ap],'b',[14,10]);
    const[x,y]=pj(ap);star(x,y,'b');label(I().altn,x+16,y+2,'b')}
  /* offset: the original route dashed between the entry point and the rejoin point, the offset path solid */
  const ofR=p=>{if(!p||!p.ofst)return null;const ie=p.legs.findIndex(l=>l.seg==='arr'||l.k==='dest');return[p.ofst.ix0??0,ie]};
  const oA=ofR(A),oT=ofR(T);
  for(const[G,tm]of geos){const o=tm===true?oT:tm?null:oA;for(const L of G.lines){const inO=o&&L.ix!=null&&L.ix>o[0]&&L.ix<=o[1];
    line(L.pts,tm==='sec'?'w':tm?'y':L.col,tm===true||inO?[16,10]:null)}}
  for(const[pl,c]of[[A,'g'],[T,'y']]){if(!pl||!pl.ofst)continue;let Pp=null;try{Pp=pl===A&&flying()&&FL.path?FL.path:buildPath(pl)}catch(e){}
    if(Pp&&Pp.ofstStart!=null){const seg=Pp.pts.filter(q=>q.s>=Pp.ofstStart-0.01&&q.s<=Pp.ofstEnd+0.01).map(q=>q.p);if(seg.length>1)line(seg,c,c==='y'?[16,10]:null)}}
  if(typeof ndFixInfo==='function')ndFixInfo(g,pj,V);
  for(const[G]of geos)for(const r of G.rwys){const[x1,y1]=pj(r.pos);
    if(r.crsT!=null){let[x2,y2]=pj(dst(r.pos,r.crsT,r.len));let dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy);
      if(L<16){const k=16/Math.max(L,1e-3);dx*=k;dy*=k;L=16}
      const nx=-dy/L*4,ny=dx/L*4;g.strokeStyle=NC.w;g.lineWidth=2.5;g.beginPath();
      g.moveTo(x1+nx,y1+ny);g.lineTo(x1+dx+nx,y1+dy+ny);g.moveTo(x1-nx,y1-ny);g.lineTo(x1+dx-nx,y1+dy-ny);g.stroke();
      if(!(V.m==='ARC'&&Math.hypot(x1-V.cx,y1-V.cy)<40))label(r.id+r.rwy,x1+16,y1+20,'w')}
    else{star(x1,y1,'w');label(r.id,x1+16,y1+2,'w')}}
  for(const[G]of geos)G.wpts.forEach(w=>inPlan.add(w.id));
  if(EFIS.wpt)for(const[id,pos]of Object.entries(DB.wpt)){if(inPlan.has(id))continue;const[x,y]=pj(pos);
    if(!inMap(x,y))continue;diamond(x,y,'m',7);label(id,x+12,y+2,'m',19)}
  /* VOR D / NDB options: navaids from OurAirports (magenta) */
  if((EFIS.vord||EFIS.ndb)&&DB.nav)for(const[id,n]of Object.entries(DB.nav)){const isN=/^NDB/.test(n.type);if(isN?!EFIS.ndb:!EFIS.vord)continue;
    const[x,y]=pj(n.pos);if(!inMap(x,y))continue;g.strokeStyle=NC.m;g.lineWidth=2.5;g.beginPath();
    if(isN){g.moveTo(x,y-11);g.lineTo(x+10,y+7);g.lineTo(x-10,y+7);g.closePath()}
    else{if(n.type!=='DME'){g.moveTo(x-12,y);g.lineTo(x+12,y);g.moveTo(x,y-12);g.lineTo(x,y+12)}if(n.type!=='VOR')g.arc(x,y,8,0,Math.PI*2)}
    g.stroke();label(id,x+14,y+14,'m',21)}
  if(EFIS.arpt){const used=new Set([A&&A.legs[0].id,A&&A.legs[idxK(A,'dest')].id,I().altn]);
    for(const[id,ap]of Object.entries(DB.apt)){if(used.has(id))continue;const[x,y]=pj(ap.pos);star(x,y,'m');label(id,x+16,y+2,'m')}}
  for(const[G,tm]of geos)for(const w of G.wpts){const[x,y]=pj(w.pos);if(!inMap(x,y,30))continue;
    const col=tm==='sec'?'w':tm?'y':(to&&w.id===to.id&&w.col==='g')?'w':w.col;diamond(x,y,col,9);label(w.id,x+16,y+2,col,26);
    if(EFIS.cstr&&!tm&&(w.alt||w.spd)){let yy=y+25;if(w.alt){label(fAlt(w.alt),x+16,yy,'m',20);yy+=22}if(w.spd)label(String(w.spd),x+16,yy,'m',20)}
    /* altitude constraint circle: in flight magenta if predicted met, amber if missed, white if not taken into account (NAV or managed vertical mode not engaged) */
    if(!tm&&w.alt&&(EFIS.cstr||flying())){let cc='m';if(flying()){const vp=vPred(),q=vp&&vp.wp[w.ix];cc=FL.lat!=='NAV'||!(vp&&vp.mgd)?'w':q&&!q.met?'a':'m'}
      g.strokeStyle=NC[cc]||NC.m;g.lineWidth=2.5;g.beginPath();g.arc(x,y,17,0,Math.PI*2);g.stroke()}}
  g.restore()}
  /* compass scale: ticks outward, numbers tangential, big every 30 degrees */
  const pol=(a,r)=>[V.cx+r*Math.sin(a*D2R),V.cy-r*Math.cos(a*D2R)];
  const tick=(a,r1,r2,col,w)=>{const[x1,y1]=pol(a,r1),[x2,y2]=pol(a,r2);g.strokeStyle=NC[col||'w'];g.lineWidth=w||3;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
  const num=(h,a)=>{const n=((h%360)+360)%360/10,big=n%3===0,[x,y]=pol(a,V.R+(big?46:40));g.save();g.translate(x,y);g.rotate(a*D2R);
    g.font=NF(big?41:27);g.fillStyle=NC.w;g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),0,0);g.restore()};
  const ring=(r,a1,lab)=>{g.strokeStyle=NC.w;g.lineWidth=4.5;g.setLineDash([19,12]);g.beginPath();g.arc(V.cx,V.cy,r,-Math.PI/2-a1*D2R,-Math.PI/2+a1*D2R);g.stroke();g.setLineDash([]);
    if(lab!=null)[-61,61].forEach(a=>{const[x,y]=pol(a,r*0.91);label(String(lab),x,y,'b',27,'center')})};
  const rl=x=>Number.isInteger(x)?x:x.toFixed(1);
  const selHdg=sweep=>{const sh=selHdgVal();if(sh==null)return;const d=((sh-hdg+540)%360)-180,v=String(sh).padStart(3,'0');
    if(Math.abs(d)<=sweep){const[x,y]=pol(d,V.R);g.save();g.translate(x,y);g.rotate(d*D2R);g.strokeStyle=NC.b;g.lineWidth=3.5;g.beginPath();g.moveTo(0,-2);g.lineTo(-11,-22);g.lineTo(11,-22);g.closePath();g.stroke();g.restore()}
    else if(V.m==='ARC'){if(d<0)label(v,24,150,'b',27);else label(v,744,150,'b',27,'right')}};
  if(V.m==='ARC'){ring(V.R/4,90,null);ring(V.R/2,81,rl(EFIS.range/2));ring(V.R*3/4,65,rl(EFIS.range*3/4));
    g.strokeStyle=NC.w;g.lineWidth=3.5;g.beginPath();g.arc(V.cx,V.cy,V.R,-Math.PI/2-1.25,-Math.PI/2+1.25);g.stroke();
    for(let h=Math.ceil((hdg-70)/5)*5;h<=hdg+70;h+=5){const a=h-hdg;tick(a,V.R,V.R+(h%10?13:22));if(h%10===0)num(h,a)}
    selHdg(48);tick(0,V.R-18,V.R+20,'ac',6)}
  else{const k=V.R/250;if(V.m!=='LS')ring(V.R/2,180,null);
    /* range labels lower left of the rings (FlyByWire ROSE/PLAN underlay) */
    if(V.m==='NAV'||V.m==='PLAN'){label(String(rl(EFIS.range/4)),V.cx-74*k,V.cy+84*k,'b',25);label(String(rl(EFIS.range/2)),V.cx-172*k,V.cy+166*k,'b',25)}
    g.strokeStyle=NC.w;g.lineWidth=3.5;g.beginPath();g.arc(V.cx,V.cy,V.R,0,Math.PI*2);g.stroke();
    if(V.m==='PLAN')[['N',0],['E',90],['S',180],['W',270]].forEach(([t,a])=>{const[x,y]=pol(a,V.R*0.856);label(t,x,y,'w',29,'center');
      const[ax,ay]=pol(a,V.R*0.97),[b1x,b1y]=pol(a-1.4,V.R*0.932),[b2x,b2y]=pol(a+1.4,V.R*0.932);g.fillStyle=NC.w;g.beginPath();g.moveTo(ax,ay);g.lineTo(b1x,b1y);g.lineTo(b2x,b2y);g.closePath();g.fill()});
    else{for(let h=0;h<360;h+=5){const a=h-hdg;tick(a,V.R,V.R+(h%10?13:22));if(h%10===0)num(h,a)}selHdg(180);tick(0,V.R-18,V.R+20,'ac',6)}}
  /* VOR / ADF bearing pointers (ROSE and ARC): VOR white, ADF green; 1 single line, 2 double line */
  if(V.m!=='PLAN')[1,2].forEach(n=>{const st=navStation(n);if(!st)return;const b=(brg(ac.pos,st.pos)-(ac.hdg+ac.vr)),col=st.adf?NC.g:NC.w,R1=V.R*0.92,R2=V.R*0.55;
    g.save();g.translate(V.cx,V.cy);g.rotate(b*D2R);g.strokeStyle=col;g.lineWidth=3;g.beginPath();
    const ln=(o)=>{g.moveTo(o,-R1);g.lineTo(o,-R2);g.moveTo(o,R2);g.lineTo(o,R1)};if(n===1)ln(0);else{ln(-5);ln(5)}
    g.moveTo(-14,-R1+22);g.lineTo(0,-R1);g.lineTo(14,-R1+22);g.stroke();g.restore()});
  if(V.m!=='PLAN')[1,2].forEach(n=>{const st=navStation(n),x=n===1?14:754,al=n===1?'left':'right',col=EFIS['nav'+n]==='ADF'?'g':'w';if(EFIS['nav'+n]==='OFF')return;
    g.textBaseline='middle';g.textAlign=al;g.font=NF(22);g.fillStyle=NC[col];g.fillText((EFIS['nav'+n]==='ADF'?'ADF':'VOR')+n,x,Hg-96);
    if(st){g.font=NF(24);g.fillText(st.id,x,Hg-66);if(!st.adf&&/DME|TAC/.test(st.type)){const d=gc(ac.pos,st.pos);g.fillStyle=NC.g;g.fillText((d<20?d.toFixed(1):String(Math.round(d)))+(n===1?'':''),n===1?x:x-40,Hg-38);g.font=NF(19);g.fillStyle=NC.b;g.fillText('NM',n===1?x+60:x,Hg-38)}}});
  /* pseudo waypoints on the route: T/C or level-off (cyan), T/D (white), DECEL (magenta D) */
  if(V.map&&A&&!T){const pw=pseudoWpts();if(pw)pw.forEach(q=>{const[x,y]=pj(q.pos);if(V.m==='PLAN'?(x<30||x>738||y<90||y>Hg-40):Math.hypot(x-V.cx,y-V.cy)>V.R)return;g.lineWidth=3;
    if(q.k==='D'){g.strokeStyle=NC.m;g.beginPath();g.arc(x,y,11,0,7);g.stroke();label('D',x,y+1,'m',18,'center');return}
    g.strokeStyle=NC[q.c];g.beginPath();
    /* drawn so that the arrow tip sits on the route at the computed point */
    if(q.k==='up'){g.moveTo(x-38,y+12);g.lineTo(x-20,y);g.lineTo(x,y);g.moveTo(x-8,y-6);g.lineTo(x,y);g.lineTo(x-8,y+6)}
    else if(q.k==='dn'){g.moveTo(x-38,y-12);g.lineTo(x-20,y);g.lineTo(x,y);g.moveTo(x-8,y-6);g.lineTo(x,y);g.lineTo(x-8,y+6)}
    else if(q.k==='sc'){g.moveTo(x-36,y+12);g.lineTo(x-16,y+12);g.lineTo(x,y);g.moveTo(x-10,y-1);g.lineTo(x,y);g.lineTo(x-2,y+10)}
    else{g.moveTo(x-36,y-12);g.lineTo(x-16,y-12);g.lineTo(x,y);g.moveTo(x-10,y+1);g.lineTo(x,y);g.lineTo(x-2,y-10)}
    g.stroke()})}
  /* aircraft symbol */
  const plane=(x,y,rot)=>{g.save();g.translate(x,y);g.rotate(rot*D2R);g.strokeStyle=NC.ac;g.lineWidth=7;g.beginPath();
    g.moveTo(0,-33);g.lineTo(0,35);g.moveTo(-37,-3);g.lineTo(37,-3);g.moveTo(-14,27);g.lineTo(14,27);g.stroke();g.restore()};
  if(V.m==='PLAN'){const[x,y]=pj(ac.pos);if(x>40&&x<728&&y>100&&y<Hg-60)plane(x,y,ac.hdg+ac.vr)}else plane(V.cx,V.cy,0);
  /* data fields */
  g.textBaseline='alphabetic';g.textAlign='left';
  g.font=NF(22);g.fillStyle=NC.w;g.fillText('GS',12,40);g.font=NF(31);g.fillStyle=NC.g;g.fillText(flying()?String(Math.round(FL.gs)):'0',56,40);
  g.font=NF(22);g.fillStyle=NC.w;g.fillText('TAS',124,40);g.font=NF(31);g.fillStyle=NC.g;g.fillText(flying()&&FL.tas>=60?String(Math.round(FL.tas)):'---',176,40);
  g.font=NF(31);g.fillStyle=NC.g;g.fillText('---',6,74);g.fillStyle=NC.w;g.fillText('/',56,74);g.fillStyle=NC.g;g.fillText('---',70,74);
  if(to&&to.pos&&V.map){const b=Math.round((brg(ac.pos,to.pos)-ac.vr+360)%360)||360,d=gc(ac.pos,to.pos);
    g.textAlign='left';g.font=NF(31);g.fillStyle=NC.w;g.fillText(to.id,520,40);
    g.textAlign='right';g.fillStyle=NC.g;g.fillText(String(b).padStart(3,'0')+'°',756,40);
    g.fillText(d<20?d.toFixed(1):String(Math.round(d)),708,76);g.font=NF(23);g.fillStyle=NC.b;g.fillText('NM',756,76)}
  if(T){g.textAlign='center';g.font=NF(20);g.fillStyle=NC.y;g.fillText('TMPY',384,Hg-20)}
  /* message box (GPS PRIMARY until cleared on the MCDU) */
  if(hasMsg('GPS PRIMARY')){const bw=438,bx=384-bw/2,by=Hg-70;g.strokeStyle=NC.w;g.lineWidth=2.5;g.strokeRect(bx,by,bw,33);label('GPS PRIMARY',384,by+18,'w',27,'center')}
  g.restore()}

/* ---------- pseudo waypoints from the vertical profile ---------- */
let _pwCache={sig:null,P:null};
function pseudoWpts(){try{const out=[],crz=I().crz*100;if(!S.active||!S.active.appr||!I().crz)return null;
  let P,s0,alt0,vs0;if(flying()){P=FL.path;s0=FL.s;alt0=FL.alt;vs0=FL.vs}else{const sig=planSig();if(_pwCache.sig!==sig){_pwCache={sig,P:buildPath()}}P=_pwCache.P;s0=0;alt0=elevO();vs0=0}
  const at=s=>posAt(P,Math.max(0,Math.min(P.len,s))).pos,td=P.sThr-tdDist(),A=FCU.alt;
  if(flying()&&!FL.ground){const climbing=['SRS','CLB','OP CLB','EXP CLB','V/S','FPA','ALT*'].includes(FL.ver)&&FL.vs>200,desc=FL.vs<-200&&!['G/S*','G/S','LAND','FLARE'].includes(FL.ver);
    const ct=cstTarget(),cw=ct!=null?(FL.cst.clbIx!=null&&FL.ver!=='DES'&&FL.verArm[0]!=='DES'?FL.cst.clbIx:FL.cst.desIx):null;
    const along=d=>FL.lat==='NAV'?at(s0+d):dst(FL.pos,FL.trkT,d);
    if(ct!=null){const up=ct>alt0+30||FL.verArm.includes('CLB')&&ct>=alt0-30;
      if(Math.abs(ct-alt0)>30&&Math.abs(FL.vs)>200){const d=Math.max(0,(ct-alt0)/FL.vs*60*FL.gs/3600);out.push({k:up?'up':'dn',c:'m',pos:along(d)})}
      /* start of climb (cyan) or descent (white) again at the constraint waypoint */
      const pt=cw!=null&&FL.path.pts.find(q=>q.ix===cw);if(pt&&pt.s>s0)out.push({k:up?'sc':'td',c:up?'b':'w',pos:at(pt.s)})}
    else if((climbing&&A>alt0)||(desc&&A<alt0)){const t=(A-alt0)/(FL.vs||1)*60,d=Math.max(0,t*FL.gs/3600);const c=A===crz?'w':'b';
      out.push({k:climbing?'up':'dn',c,pos:along(d)})}}
  else if(!flying()){out.push({k:'up',c:'w',pos:at(PM.climb(I().crz).d)});const vp=vPred();if(vp)vp.lv.forEach(q=>out.push({k:q.k,c:q.k==='up'?'m':'w',pos:at(q.s)}))}
  if(s0<td&&(!flying()||['CLB','CRZ','TAKEOFF'].includes(S.phase)))out.push({k:'td',c:'w',pos:at(td)});
  if(P.sThr-s0>25&&(!flying()||S.phase!=='APPR'))out.push({k:'D',pos:at(P.sThr-25)});
  return out}catch(e){return null}}

/* ---------- 2D ND (in the panel photo) ---------- */
const IMG_ND='img/nd-bezel.webp',IMG_EFIS='img/efis.webp';
const ndC=$('#nd'),ndG=ndC?ndC.getContext('2d'):null;
if($('#ndBezel'))$('#ndBezel').src=IMG_ND;
function drawND2D(){if(!ndG)return;drawND(ndG,ndC.width,ndC.height,true);efisUI()}
if(ndC)new ResizeObserver(()=>{const d=devicePixelRatio||1,w=Math.round(ndC.clientWidth*d),h=Math.round(ndC.clientHeight*d);
  if(w&&(w!==ndC.width||h!==ndC.height)){ndC.width=w;ndC.height=h;drawND2D()}}).observe(ndC);

/* ---------- EFIS control panel (photo 676 x 401, live buttons and knobs) ---------- */
const EW=676,EH=401;
const EK={mode:{cx:342,cy:233,r:52,photo:45,ang:{LS:-90,VOR:-45,NAV:0,ARC:45,PLAN:90}},
          range:{cx:567,cy:231,r:52,photo:-90,ang:{10:-90,20:-45,40:0,80:45,160:90,320:135}}};
const EB=[['cstr',281],['wpt',365],['vord',449],['ndb',533],['arpt',617]];      /* x centres of the five pushbuttons */
const ELBL={mode:[['LS',247,232],['VOR',273,167],['NAV',343,147],['ARC',407,165],['PLAN',440,226],['NAV',268,147]],
            range:[[10,516,232],[20,506,167],[40,567,146],[80,623,166],[160,651,232],[320,648,282]]};
const pct=(v,t)=>(v/t*100).toFixed(3)+'%';
function buildEfis(){const host=$('#efis');if(!host)return;
  let h=`<img class="efis-img" src="${IMG_EFIS}" alt="EFIS control panel">`;
  for(const[k,x]of EB)h+=`<button class="efb" type="button" data-efis="${k}" aria-label="${k.toUpperCase()}" style="left:${pct(x-36,EW)};top:${pct(70,EH)};width:${pct(72,EW)};height:${pct(48,EH)}"><i></i></button>`;
  for(const k of['mode','range']){const K=EK[k],d=2*K.r;
    h+=`<div class="knob" id="knob-${k}" style="left:${pct(K.cx-K.r,EW)};top:${pct(K.cy-K.r,EH)};width:${pct(d,EW)};height:${pct(d,EH)}"><img src="${IMG_EFIS}" alt="" style="width:${(EW/d*100).toFixed(2)}%;left:${(-(K.cx-K.r)/d*100).toFixed(2)}%;top:${(-(K.cy-K.r)/d*100).toFixed(2)}%"></div>`;
    h+=`<button class="kz" type="button" data-turn="${k}:-1" aria-label="Turn ${k} selector left" style="left:${pct(K.cx-K.r,EW)};top:${pct(K.cy-K.r,EH)};width:${pct(K.r,EW)};height:${pct(d,EH)}"></button>`;
    h+=`<button class="kz" type="button" data-turn="${k}:1" aria-label="Turn ${k} selector right" style="left:${pct(K.cx,EW)};top:${pct(K.cy-K.r,EH)};width:${pct(K.r,EW)};height:${pct(d,EH)}"></button>`;
    for(const[v,x,y]of ELBL[k])h+=`<button class="kl" type="button" data-efis="${k}:${v}" aria-label="${k} ${v}" style="left:${pct(x-24,EW)};top:${pct(y-14,EH)};width:${pct(48,EW)};height:${pct(28,EH)}"></button>`}
  h+=`<button type="button" class="efb2" id="efis-fd" data-efis="fd" aria-label="FD" style="left:${pct(67,EW)};top:${pct(330,EH)};width:${pct(70,EW)};height:${pct(45,EH)}"><i style="left:19%;width:60%;top:13%;height:31%"></i></button>`;
  h+=`<button type="button" class="efb2" id="efis-ls" data-efis="ls" aria-label="LS" style="left:${pct(150,EW)};top:${pct(330,EH)};width:${pct(70,EW)};height:${pct(45,EH)}"><i style="left:19%;width:60%;top:13%;height:31%"></i></button>`;
  h+=`<canvas class="qnh-disp" style="position:absolute;left:${pct(76,EW)};top:${pct(99,EH)};width:${pct(131,EW)};height:${pct(64,EH)};pointer-events:none"></canvas>`;
  h+=`<button type="button" class="fz knobz" id="efis-baro" aria-label="Baro knob: turn, pull STD, push QNH" style="left:${pct(108,EW)};top:${pct(213,EH)};width:${pct(84,EW)};height:${pct(84,EH)}"></button>`;
  h+=`<button type="button" class="kl" data-efis="inhg:1" aria-label="in Hg" style="left:${pct(66,EW)};top:${pct(186,EH)};width:${pct(46,EW)};height:${pct(24,EH)}"></button>`;
  h+=`<button type="button" class="kl" data-efis="inhg:0" aria-label="hPa" style="left:${pct(186,EW)};top:${pct(186,EH)};width:${pct(40,EW)};height:${pct(24,EH)}"></button>`;
  [[1,337,342],[2,567,345]].forEach(([n,cx,cy])=>{h+=`<span class="vsw" id="vsw${n}" style="left:${pct(cx-15,EW)};top:${pct(cy-15,EH)};width:${pct(30,EW)};height:${pct(30,EH)}"><i></i></span>`;
    h+=`<button type="button" class="kl" data-efis="nav${n}:ADF" aria-label="ADF ${n}" style="left:${pct(cx-62,EW)};top:${pct(cy-16,EH)};width:${pct(42,EW)};height:${pct(32,EH)}"></button>`;
    h+=`<button type="button" class="kl" data-efis="nav${n}:VOR" aria-label="VOR ${n}" style="left:${pct(cx+18,EW)};top:${pct(cy-16,EH)};width:${pct(48,EW)};height:${pct(32,EH)}"></button>`;
    h+=`<button type="button" class="kl" data-efis="nav${n}:OFF" aria-label="OFF ${n}" style="left:${pct(cx-24,EW)};top:${pct(cy+18,EH)};width:${pct(48,EW)};height:${pct(26,EH)}"></button>`});
  host.innerHTML=h;
  const qc=host.querySelector('.qnh-disp');new ResizeObserver(()=>{const d=devicePixelRatio||1;qc.width=Math.round(qc.clientWidth*d);qc.height=Math.round(qc.clientHeight*d);drawQnh()}).observe(qc);
  $('#efis-baro').addEventListener('click',e=>openKnob('baro',e.currentTarget));
  $('#efis-baro').addEventListener('wheel',e=>{e.preventDefault();fcuTurn('baro',e.deltaY<0?1:-1)},{passive:false});
  host.querySelectorAll('[data-efis]').forEach(b=>b.addEventListener('click',()=>{const[k,v]=b.dataset.efis.split(':');efisSet(k,v)}));
  host.querySelectorAll('[data-turn]').forEach(b=>b.addEventListener('click',()=>{const[k,d]=b.dataset.turn.split(':');efisTurn(k,+d)}))}
function drawQnh(){const c=document.querySelector('#efis .qnh-disp');if(!c)return;const g=c.getContext('2d'),k=c.width/131;g.setTransform(k,0,0,k,0,0);
  g.fillStyle='#0b0a08';g.fillRect(0,0,131,64);g.fillStyle='#fde990';g.textBaseline='alphabetic';
  if(EFIS.std){g.font='34px AirbusFCU,monospace';g.textAlign='center';g.fillText('Std',65,52)}
  else{g.font='600 13px "Helvetica Neue",Arial,sans-serif';g.textAlign='right';g.fillText('QNH',124,16);g.font='34px AirbusFCU,monospace';g.textAlign='center';
    g.fillText(EFIS.inhg?(EFIS.baro*0.02953).toFixed(2):String(Math.round(EFIS.baro)),65,56)}}
function efisUI(){document.querySelectorAll('.efb').forEach(b=>b.setAttribute('aria-pressed',String(!!EFIS[b.dataset.efis])));
  [1,2].forEach(n=>{const el=$('#vsw'+n);if(el)el.dataset.pos=EFIS['nav'+n]});drawQnh();
  for(const k of['mode','range']){const el=$('#knob-'+k);if(!el)continue;const K=EK[k];el.style.transform=`rotate(${K.ang[EFIS[k]]-K.photo}deg)`}}
function efisTurn(k,d){const list=k==='mode'?MODES:RANGES,i=list.indexOf(EFIS[k])+d;if(i<0||i>=list.length)return;efisSet(k,String(list[i]))}
function efisSet(k,v){if(k==='range')EFIS.range=+v;else if(k==='mode')EFIS.mode=v==='ROSE'?'NAV':v;
  else if(k==='nav1'||k==='nav2')EFIS[k]=v;
  else if(k==='inhg')EFIS.inhg=v==='1';
  else if(EFIS_OPTS.includes(k)){const on=!EFIS[k];EFIS_OPTS.forEach(o=>EFIS[o]=false);EFIS[k]=on}   /* options are mutually exclusive: one at a time */
  else EFIS[k]=!EFIS[k];   /* FD, LS */
  drawND2D();tasks();if(window.__draw3D)window.__draw3D();if(window.drawPFD2D)drawPFD2D();if(typeof setFma==='function'&&flying())setFma();if(window.drawFcu)fcuLights()}
buildEfis();
