'use strict';
/* ================= ND (navigation display) =================
   ROSE NAV, ARC and PLAN drawn from the active and temporary flight plans.
   Drawn on a 768 x 768 design grid, scaled to whatever canvas it is given. */
const EFIS={mode:'ARC',range:40,cstr:false,wpt:false,arpt:false,ctr:null};
const RANGES=[10,20,40,80,160,320];
const NC={g:'#3df24e',w:'#ffffff',b:'#3fd2ff',y:'#fff23d',m:'#ff6cf6',a:'#ffa21f',ac:'#ffe600',dim:'#8a949c'};
const NF=(px,w)=>`${w||500} ${px}px "IBM Plex Mono",ui-monospace,monospace`;

/* aircraft on the ground: at the threshold of the F-PLN runway, else at the airport */
function acState(){const p=S.active,o=p?p.legs[0].id:'OEJN',ap=DB.apt[o]||DB.apt.OEJN;
  const r=p&&p.rwy&&ap.rwy[p.rwy];return{pos:r?r.pos:ap.pos,hdg:r?r.crs:156,vr:ap.var||0}}
function toWpt(){const p=S.active;if(!p)return null;const l=p.legs.find((x,i)=>i>0&&x.k==='wpt');return l?{id:l.id,pos:DB.wpt[l.id]}:null}

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
  p.legs.forEach(l=>{const col=l.seg==='map'?'b':base;
    if(l.k==='orig'||l.k==='dest'){const ap=DB.apt[l.id],r=l.rwy&&ap.rwy[l.rwy],pos=r?r.pos:ap.pos;vr=ap.var||0;
      if(l.k==='dest'&&prev)G.lines.push({pts:[prev,pos],col});
      G.rwys.push({id:l.id,rwy:l.rwy,pos,crsT:r?r.crs+vr:null,len:r?r.len/1852:0});prev=pos;return}
    if(l.k==='wpt'){const pos=DB.wpt[l.id];if(!pos){prev=null;return}
      if(prev)G.lines.push({pts:l.lbl==='ARC'&&l.ctr&&DB.wpt[l.ctr]?arcPts(prev,pos,DB.wpt[l.ctr]):[prev,pos],col});
      G.wpts.push({id:l.id,pos,col,alt:l.alt,spd:l.spd});prev=pos;return}
    if(l.k==='hdg'&&prev){const c=crs(l.lbl);if(c==null){prev=null;return}const q=dst(prev,c+vr,5);G.lines.push({pts:[prev,q],col});prev=q;return}
    if(l.k==='hold'&&prev){const c=crs(l.lbl);if(c!=null)G.lines.push({pts:holdPts(prev,c+vr,/R$/.test(l.id)),col});return}
    prev=null});
  return G}

/* ---------- projection ---------- */
function ndView(){const ac=acState(),m=EFIS.mode,hT=ac.hdg+ac.vr;
  if(m==='ARC')return{m,ac,cx:384,cy:640,R:470,nm:EFIS.range,ctr:ac.pos,rot:hT};
  return{m,ac,cx:384,cy:404,R:250,nm:EFIS.range/2,ctr:m==='PLAN'&&EFIS.ctr?EFIS.ctr.pos:ac.pos,rot:m==='PLAN'?0:hT}}
function projF(V){const k=V.R/V.nm;return pos=>{const d=gc(V.ctr,pos);if(d<1e-6)return[V.cx,V.cy];const b=(brg(V.ctr,pos)-V.rot)*D2R;
  return[V.cx+d*k*Math.sin(b),V.cy-d*k*Math.cos(b)]}}

/* ---------- drawing ---------- */
function drawND(g,N,powered){g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,N,N);
  if(!powered){g.restore();return}
  g.scale(N/768,N/768);const V=ndView(),pj=projF(V),ac=V.ac,hdg=ac.hdg;g.lineCap='round';g.lineJoin='round';
  /* map, clipped to the compass */
  g.save();g.beginPath();g.arc(V.cx,V.cy,V.R,0,Math.PI*2);g.clip();
  const A=S.active,T=S.tmpy,to=toWpt(),inPlan=new Set();
  const line=(pts,col,dash,w)=>{g.strokeStyle=NC[col];g.lineWidth=w||3;g.setLineDash(dash||[]);g.beginPath();pts.forEach((p,i)=>{const[x,y]=pj(p);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();g.setLineDash([])};
  const label=(t,x,y,col,px)=>{g.font=NF(px||22);g.fillStyle=NC[col];g.textAlign='left';g.textBaseline='middle';g.fillText(t,x,y)};
  const diamond=(x,y,col,s,fill)=>{g.beginPath();g.moveTo(x,y-s);g.lineTo(x+s,y);g.lineTo(x,y+s);g.lineTo(x-s,y);g.closePath();g.strokeStyle=NC[col];g.lineWidth=2.5;g.stroke()};
  const star=(x,y,col)=>{g.strokeStyle=NC[col];g.lineWidth=2.5;g.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/4;g.moveTo(x-11*Math.cos(a),y-11*Math.sin(a));g.lineTo(x+11*Math.cos(a),y+11*Math.sin(a))}g.stroke()};
  const geos=[];if(A)geos.push([planGeo(A,'g'),false]);if(T)geos.push([planGeo(T,'y'),true]);
  /* alternate route */
  if(A&&I().altn&&DB.apt[I().altn]){const d=A.legs[idxK(A,'dest')],dp=legPos(d),ap=DB.apt[I().altn].pos;line([dp,ap],'b',[12,10]);
    const[x,y]=pj(ap);star(x,y,'b');label(I().altn,x+16,y+2,'b')}
  for(const[G,tm]of geos)for(const L of G.lines)line(L.pts,tm?'y':L.col,tm?[14,10]:null);
  /* runways and airports of the flight plan */
  for(const[G]of geos)for(const r of G.rwys){const[x1,y1]=pj(r.pos);
    if(r.crsT!=null){let[x2,y2]=pj(dst(r.pos,r.crsT,r.len));let dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy);
      if(L<16){const k=16/Math.max(L,1e-3);dx*=k;dy*=k;L=16}
      const nx=-dy/L*4,ny=dx/L*4;g.strokeStyle=NC.w;g.lineWidth=2;g.beginPath();
      g.moveTo(x1+nx,y1+ny);g.lineTo(x1+dx+nx,y1+dy+ny);g.moveTo(x1-nx,y1-ny);g.lineTo(x1+dx-nx,y1+dy-ny);g.stroke();
      label(r.id+r.rwy,x1+14,y1+18,'w')}
    else{star(x1,y1,'w');label(r.id,x1+16,y1+2,'w')}}
  /* EFIS options (magenta) */
  for(const[G]of geos)G.wpts.forEach(w=>inPlan.add(w.id));
  if(EFIS.wpt)for(const[id,pos]of Object.entries(DB.wpt)){if(inPlan.has(id))continue;const[x,y]=pj(pos);
    if(Math.hypot(x-V.cx,y-V.cy)>V.R)continue;diamond(x,y,'m',7);label(id,x+12,y+2,'m',19)}
  if(EFIS.arpt){const used=new Set([A&&A.legs[0].id,A&&A.legs[idxK(A,'dest')].id,I().altn]);
    for(const[id,ap]of Object.entries(DB.apt)){if(used.has(id))continue;const[x,y]=pj(ap.pos);star(x,y,'m');label(id,x+16,y+2,'m')}}
  /* waypoints */
  for(const[G,tm]of geos)for(const w of G.wpts){const[x,y]=pj(w.pos);if(Math.hypot(x-V.cx,y-V.cy)>V.R+30)continue;
    const col=tm?'y':(!tm&&to&&w.id===to.id&&w.col==='g')?'w':w.col;diamond(x,y,col,9);label(w.id,x+16,y+2,col);
    if(EFIS.cstr&&!tm&&(w.alt||w.spd)){let yy=y+24;if(w.alt){label(fAlt(w.alt),x+16,yy,'m',19);yy+=21}if(w.spd)label(String(w.spd),x+16,yy,'m',19);
      g.strokeStyle=NC.m;g.lineWidth=2;g.beginPath();g.arc(x,y,17,0,Math.PI*2);g.stroke()}}
  g.restore();
  /* compass, range rings */
  const tick=(a,r1,r2,col,w)=>{const s=Math.sin(a*D2R),c=Math.cos(a*D2R);g.strokeStyle=NC[col||'w'];g.lineWidth=w||2.5;g.beginPath();g.moveTo(V.cx+r1*s,V.cy-r1*c);g.lineTo(V.cx+r2*s,V.cy-r2*c);g.stroke()};
  const ring=(r,lab,ang)=>{g.strokeStyle=NC.w;g.lineWidth=2.5;g.setLineDash([3,11]);g.beginPath();g.arc(V.cx,V.cy,r,0,Math.PI*2);g.stroke();g.setLineDash([]);
    const s=Math.sin(ang*D2R),c=Math.cos(ang*D2R);g.font=NF(20);g.fillStyle=NC.b;g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='#000';const t=String(lab),tw=g.measureText(t).width;g.fillRect(V.cx+r*s-tw/2-3,V.cy-r*c-11,tw+6,22);g.fillStyle=NC.b;g.fillText(t,V.cx+r*s,V.cy-r*c)};
  const rl=x=>Number.isInteger(x)?x:x.toFixed(1);
  if(V.m==='ARC'){[1,2,3].forEach(i=>ring(V.R*i/4,rl(EFIS.range*i/4),-58));
    g.save();g.beginPath();g.rect(0,60,768,708);g.clip();g.strokeStyle=NC.w;g.lineWidth=3;g.beginPath();g.arc(V.cx,V.cy,V.R,-Math.PI/2-1.0,-Math.PI/2+1.0);g.stroke();
    for(let h=Math.ceil((hdg-60)/5)*5;h<=hdg+60;h+=5){const a=h-hdg;if(Math.abs(a)>58)continue;tick(a,V.R,V.R+(h%10?11:20));
      if(h%10===0){const n=((h%360)+360)%360/10,big=n%3===0;g.save();g.translate(V.cx+(V.R+42)*Math.sin(a*D2R),V.cy-(V.R+42)*Math.cos(a*D2R));g.rotate(a*D2R);
        g.font=NF(big?30:22);g.fillStyle=NC.w;g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),0,0);g.restore()}}
    g.restore();tick(0,V.R-18,V.R+30,'ac',5)}
  else if(V.m==='ROSE'){ring(V.R/2,rl(EFIS.range/4),-45);g.strokeStyle=NC.w;g.lineWidth=3;g.beginPath();g.arc(V.cx,V.cy,V.R,0,Math.PI*2);g.stroke();
    for(let h=0;h<360;h+=5){const a=h-hdg;tick(a,V.R,V.R+(h%10?11:20));
      if(h%10===0){const n=h/10,big=n%3===0;g.save();g.translate(V.cx+(V.R+42)*Math.sin(a*D2R),V.cy-(V.R+42)*Math.cos(a*D2R));g.rotate(a*D2R);
        g.font=NF(big?30:22);g.fillStyle=NC.w;g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),0,0);g.restore()}}
    tick(0,V.R-18,V.R+30,'ac',5)}
  else{ring(V.R/2,rl(EFIS.range/4),-45);g.strokeStyle=NC.w;g.lineWidth=3;g.beginPath();g.arc(V.cx,V.cy,V.R,0,Math.PI*2);g.stroke();
    [['N',0],['E',90],['S',180],['W',270]].forEach(([t,a])=>{tick(a,V.R-14,V.R+14);g.save();g.translate(V.cx+(V.R+36)*Math.sin(a*D2R),V.cy-(V.R+36)*Math.cos(a*D2R));
      g.font=NF(28,600);g.fillStyle=NC.w;g.textAlign='center';g.textBaseline='middle';g.fillText(t,0,0);g.restore()})}
  /* aircraft symbol */
  const plane=(x,y,rot)=>{g.save();g.translate(x,y);g.rotate(rot*D2R);g.strokeStyle=NC.ac;g.lineWidth=6;g.beginPath();
    g.moveTo(0,-26);g.lineTo(0,38);g.moveTo(-30,-2);g.lineTo(30,-2);g.moveTo(-11,30);g.lineTo(11,30);g.stroke();g.restore()};
  if(V.m==='PLAN'){const[x,y]=pj(ac.pos);if(Math.hypot(x-V.cx,y-V.cy)<V.R)plane(x,y,ac.hdg+ac.vr)}else plane(V.cx,V.cy,0);
  /* data fields */
  g.textBaseline='alphabetic';g.textAlign='left';
  g.font=NF(20);g.fillStyle=NC.w;g.fillText('GS',14,34);g.font=NF(26);g.fillStyle=NC.g;g.fillText('  0',44,34);
  g.font=NF(20);g.fillStyle=NC.w;g.fillText('TAS',116,34);g.font=NF(26);g.fillStyle=NC.g;g.fillText('---',162,34);
  if(to&&to.pos){const b=Math.round((brg(ac.pos,to.pos)-ac.vr+360)%360)||360,d=gc(ac.pos,to.pos);
    g.textAlign='left';g.font=NF(26);g.fillStyle=NC.w;g.fillText(to.id,540,34);
    g.textAlign='right';g.fillStyle=NC.g;g.fillText(String(b).padStart(3,'0')+'°',754,34);
    g.fillText(d<20?d.toFixed(1):String(Math.round(d)),712,66);g.font=NF(20);g.fillStyle=NC.b;g.fillText('NM',754,66)}
  if(V.m==='PLAN'&&EFIS.ctr){g.textAlign='left';g.font=NF(18);g.fillStyle=NC.dim;g.fillText('CTR '+EFIS.ctr.id,14,750)}
  if(T){g.textAlign='right';g.font=NF(18);g.fillStyle=NC.y;g.fillText('TMPY F-PLN',754,750)}
  g.restore()}

/* ---------- 2D panel + EFIS control ---------- */
const ndC=$('#nd'),ndG=ndC?ndC.getContext('2d'):null;
function drawND2D(){if(!ndG)return;const N=ndC.width;drawND(ndG,N,true);efisUI()}
if(ndC)new ResizeObserver(()=>{const w=Math.round(ndC.clientWidth*(devicePixelRatio||1));if(w&&w!==ndC.width){ndC.width=ndC.height=w;drawND2D()}}).observe(ndC);
function efisUI(){document.querySelectorAll('[data-efis]').forEach(b=>{const[k,v]=b.dataset.efis.split(':');
  b.setAttribute('aria-pressed',v?String(EFIS[k]===v):String(!!EFIS[k]))});const r=$('#ndRange');if(r)r.textContent=EFIS.range}
function efisSet(k,v){if(k==='range'){const i=RANGES.indexOf(EFIS.range)+(v==='+'?1:-1);if(i<0||i>=RANGES.length)return;EFIS.range=RANGES[i]}
  else if(v)EFIS[k]=v;else EFIS[k]=!EFIS[k];drawND2D();tasks();if(window.__draw3D)window.__draw3D()}
document.querySelectorAll('[data-efis]').forEach(b=>b.addEventListener('click',()=>{const[k,v]=b.dataset.efis.split(':');efisSet(k,v)}));
