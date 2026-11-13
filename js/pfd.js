'use strict';
/* ================= PFD ================= 768-wide design grid, height follows the screen */
const PC={sky:'#1f86d6',gnd:'#7e5129',tape:'#5a5f66',w:'#ffffff',g:'#3df24e',b:'#3fd2ff',m:'#ff6cf6',a:'#ffa21f',y:'#ffe600',r:'#ff2a2a'};
const PF=(px,w)=>`${w||500} ${px}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
function vmaxFor(conf,alt,mach){const v={'0':350,'1':230,'1+F':215,'2':200,'3':185,'FULL':177}[conf]||350;return conf==='0'?Math.min(v,iasOf(0.82*sos(alt),alt)):v}
function drawPFD(g,W,H,powered){g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,W,H);if(!powered){g.restore();return}
  const sc=W/768,Hg=H/sc;g.scale(sc,sc);
  const on=FL.active,o=orig(),ap=o?DB.apt[o]:DB.apt.OEJN,ac=acState();
  const ias=on?FL.ias:0,alt=on?FL.alt:(S.active&&S.active.rwy?(ap.rwy[S.active.rwy].tdze??ap.elev):ap.elev),vs=on?FL.vs:0,pitch=on?FL.pitch:0,roll=on?FL.roll:0;
  const hdgM=((ac.hdg)%360+360)%360,agl=on?FL.alt-groundElev():0;
  const T=(t,x,y,col,px,al,w)=>{g.font=PF(px||24,w);g.fillStyle=PC[col]||col;g.textAlign=al||'left';g.textBaseline='middle';g.fillText(t,x,y)};
  const L=(x1,y1,x2,y2,col,w)=>{g.strokeStyle=PC[col]||col;g.lineWidth=w||3;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
  const cx=360,cy=Math.round((Hg-110)/2+62);

  /* ---- FMA ---- */
  const cols=[[0,150],[150,330],[330,488],[488,604],[604,768]],F=FL.fma;
  [150,330,488,604].forEach(x=>L(x,8,x,94,'#9aa3ab',2));
  ['c1','c2','c3','c4','c5'].forEach((c,k)=>{const[x1,x2]=cols[k],xm=(x1+x2)/2;(F[c]||[]).forEach((ln,j)=>{if(!ln||!ln[0])return;
    const flash=ln[2]&&Math.floor(FL.t*2)%2===0;if(!flash)T(ln[0],xm,24+30*j,ln[1],c==='c4'||c==='c5'?22:25,'center');
    if(j===0&&k<3&&on&&FL.t-(FL.fmaT[c]??-99)<10){g.font=PF(25);const tw=g.measureText(ln[0]).width;g.strokeStyle=PC.w;g.lineWidth=2;g.strokeRect(xm-tw/2-6,8,tw+12,32)}})});
  if(F.land){const xm=(150+488)/2;T(F.land,xm,24,'g',25,'center');if(on&&FL.t-(FL.fmaT.land??-99)<10){g.font=PF(25);const tw=g.measureText(F.land).width;g.strokeStyle=PC.w;g.lineWidth=2;g.strokeRect(xm-tw/2-6,8,tw+12,32)}}

  /* ---- attitude ---- */
  const aw=330,ah=380,ppd=8.2;
  g.save();g.beginPath();g.roundRect(cx-aw/2,cy-ah/2+10,aw,ah-10,[60,60,60,60]);g.clip();
  g.translate(cx,cy);g.rotate(-roll*D2R);g.translate(0,pitch*ppd);
  g.fillStyle=PC.sky;g.fillRect(-600,-1200,1200,1200);g.fillStyle=PC.gnd;g.fillRect(-600,0,1200,1200);L(-600,0,600,0,'w',3);
  for(let p=-30;p<=30;p+=2.5){if(!p)continue;const y=-p*ppd,w=p%10===0?110:p%5===0?60:28;L(-w/2,y,w/2,y,'w',2.5);
    if(p%10===0){T(String(Math.abs(p)),-w/2-28,y,'w',22,'center');T(String(Math.abs(p)),w/2+28,y,'w',22,'center')}}
  /* heading marks on the horizon line */
  g.restore();
  /* roll scale */
  g.save();g.translate(cx,cy);
  const R=175;g.strokeStyle=PC.w;g.lineWidth=3;g.beginPath();g.arc(0,0,R,(-90-45)*D2R,(-90+45)*D2R);g.stroke();
  [-45,-30,-20,-10,10,20,30,45].forEach(a=>{const l=Math.abs(a)%30===0||Math.abs(a)===45?18:12,s=Math.sin(a*D2R),c=Math.cos(a*D2R);L(R*s,-R*c,(R+l)*s,-(R+l)*c,'w',3)});
  g.fillStyle=PC.y;g.beginPath();g.moveTo(0,-R);g.lineTo(-11,-R-18);g.lineTo(11,-R-18);g.closePath();g.fill();
  g.rotate(-roll*D2R);g.fillStyle=PC.y;g.beginPath();g.moveTo(0,-R+4);g.lineTo(-12,-R+22);g.lineTo(12,-R+22);g.closePath();g.fill();g.fillRect(-14,-R+25,28,6);
  g.restore();
  /* FD bars */
  if(!['ROLLOUT','STOP'].includes(FL.stage)){L(cx-100,cy,cx+100,cy,'g',4);L(cx,cy-100,cx,cy+100,'g',4)}
  /* aircraft symbol */
  const wing=(s)=>{g.fillStyle='#000';g.fillRect(cx+s*60,cy-5,s*90,10);g.strokeStyle=PC.y;g.lineWidth=4;g.strokeRect(cx+s*60,cy-5,s*90,10);
    g.fillStyle='#000';g.fillRect(cx+s*60-(s<0?10:0),cy-5,10,28);g.strokeRect(cx+s*60-(s<0?10:0),cy-5,10,28)};
  wing(-1);wing(1);g.fillStyle='#000';g.fillRect(cx-7,cy-7,14,14);g.strokeStyle=PC.y;g.lineWidth=4;g.strokeRect(cx-7,cy-7,14,14);
  /* radio altitude */
  if(on&&agl<2500&&!FL.ground){const ra=agl>50?Math.round(agl/10)*10:Math.max(0,Math.round(agl/5)*5);T(String(ra),cx,cy+150,agl<(S.p2.radio>0?S.p2.radio:0)?'a':'g',30,'center',600)}

  /* ---- ILS deviation (on approach) ---- */
  if(on&&FL.apprPb){const d=destRwy(),thr=d.r.pos,crsT=d.r.crs+(d.a.var||0),dist=gc(FL.pos,thr);
    const ang=((brg(FL.pos,thr)-crsT+540)%360)-180,locDots=Math.max(-2.2,Math.min(2.2,-ang/0.8));
    const gsAng=Math.atan2(FL.alt-(d.tdze+50),Math.max(0.1,dist)*6076)/D2R,gsDots=Math.max(-2.2,Math.min(2.2,(gsAng-3)/0.4));
    for(let k=-2;k<=2;k++){if(k){g.strokeStyle=PC.w;g.lineWidth=2.5;g.beginPath();g.arc(cx+k*50,cy+178,6,0,7);g.stroke();g.beginPath();g.arc(cx+aw/2+22,cy-k*50,6,0,7);g.stroke()}}
    L(cx,cy+165,cx,cy+191,'y',4);L(cx+aw/2+8,cy,cx+aw/2+36,cy,'y',4);
    const dia=(x,y,hz)=>{g.strokeStyle=PC.m;g.lineWidth=3;g.beginPath();if(hz){g.moveTo(x-16,y);g.lineTo(x,y-9);g.lineTo(x+16,y);g.lineTo(x,y+9)}else{g.moveTo(x,y-16);g.lineTo(x+9,y);g.lineTo(x,y+16);g.lineTo(x-9,y)}g.closePath();g.stroke()};
    dia(cx+locDots*50,cy+178,true);dia(cx+aw/2+22,cy+gsDots*50,false);
    const ap2=S.active&&S.active.appr&&(APPRS[destId()]||{})[S.active.appr];T(ap2?ap2.nav:'',12,Hg-150,'m',23);T(dist.toFixed(1)+'NM',12,Hg-122,'m',23)}

  /* ---- speed tape ---- */
  const sx1=36,sx2=150,sTop=cy-200,sBot=cy+200,kpx=4.8,sv=Math.max(30,ias);
  g.save();g.beginPath();g.rect(sx1,sTop,sx2-sx1+30,sBot-sTop);g.clip();g.fillStyle=PC.tape;g.fillRect(sx1,sTop,sx2-sx1,sBot-sTop);
  const sy=v=>cy-(v-sv)*kpx;
  for(let v=Math.floor((sv-45)/10)*10;v<=sv+45;v+=10){if(v<30)continue;const y=sy(v);L(sx2-14,y,sx2,y,'w',3);if(v%20===0)T(String(v),sx2-22,y,'w',25,'right')}
  if(on&&!FL.ground){const sp=cfgSpeeds(),vmax=vmaxFor(FL.conf,FL.alt,FL.mach);
    for(let y=sy(vmax);y>sTop-20;y-=16){g.fillStyle=PC.r;g.fillRect(sx2,y-16,10,8);g.fillStyle='#000';g.fillRect(sx2,y-8,10,8)}
    g.fillStyle=PC.a;g.fillRect(sx2,sy(sp.VLS),5,sy(sp.VLS-30)-sy(sp.VLS));
    if(FL.conf==='0'){g.strokeStyle=PC.g;g.lineWidth=3;g.beginPath();g.arc(sx2+10,sy(sp.GD),7,0,7);g.stroke()}
    else if(FL.conf==='1'||FL.conf==='1+F')T('S',sx2+6,sy(sp.S),'g',24);else if(FL.conf==='2'||FL.conf==='3')T('F',sx2+6,sy(sp.F),'g',24)}
  if(on&&FL.ground&&FL.stage==='ROLL'){const q=S.perf;T('1',sx2+6,sy(q.v1),'b',26)}
  const tgt=on?(FL.stage==='ROLL'||FL.stage==='SRS0'||FL.stage==='LVR'||FL.stage==='SRS'?S.perf.v2+(FL.stage==='ROLL'?0:10):Math.round(FL.ias)):(S.perf.v2||null);
  if(tgt){const y=sy(tgt);if(y>sTop&&y<sBot){g.fillStyle=PC.m;g.beginPath();g.moveTo(sx2+2,y);g.lineTo(sx2+18,y-11);g.lineTo(sx2+18,y+11);g.closePath();g.fill()}}
  g.restore();
  L(sx1-6,cy,sx2+24,cy,'y',4);g.fillStyle=PC.y;g.beginPath();g.moveTo(sx2+6,cy);g.lineTo(sx2+24,cy-10);g.lineTo(sx2+24,cy+10);g.closePath();g.fill();
  if(on&&FL.mach>0.5)T('.'+Math.round(FL.mach*100),(sx1+sx2)/2,sBot+30,'g',28,'center');

  /* ---- altitude tape ---- */
  const ax1=600,ax2=680,apx=0.40;
  g.save();g.beginPath();g.rect(ax1,sTop,ax2-ax1+10,sBot-sTop);g.clip();g.fillStyle=PC.tape;g.fillRect(ax1,sTop,ax2-ax1,sBot-sTop);
  const ay=v=>cy-(v-alt)*apx;
  for(let v=Math.floor((alt-600)/100)*100;v<=alt+600;v+=100){const y=ay(v);L(ax2-(v%500===0?18:10),y,ax2,y,'w',3);if(v%500===0&&v>=0)T(String(v/100).padStart(3,' '),ax1+8,y,'w',24)}
  g.restore();
  /* readout */
  const big=String(Math.floor(Math.max(0,alt)/100)).padStart(3,' '),drum=String(Math.floor((Math.max(0,alt)%100)/20)*20).padStart(2,'0');
  g.fillStyle='#000';g.fillRect(ax1-4,cy-24,92,48);g.strokeStyle=PC.y;g.lineWidth=3;g.strokeRect(ax1-4,cy-24,92,48);T(big,ax1+2,cy,'g',32);T(drum,ax1+60,cy,'g',24);
  /* target altitude and baro */
  const fcu=on?(['DES','ALT','GSS','GS','LAND','FLARE'].includes(FL.stage)?faf():I().crz*100):(I().crz?I().crz*100:null);
  if(fcu!=null){const t=fcu>=(TA[o]||13000)?'FL'+String(fcu/100).padStart(3,'0'):String(fcu);const y=ay(fcu);
    if(y<sTop)T(t,(ax1+ax2)/2,sTop-22,'b',24,'center');else if(y>sBot)T(t,(ax1+ax2)/2,sBot+22,'b',24,'center');else{g.fillStyle=PC.b;g.fillRect(ax1,y-3,ax2-ax1,6)}}
  const std=on&&FL.alt>(TA[o]||13000)&&!['DES','ALT','GSS','GS','LAND','FLARE','ROLLOUT','STOP'].includes(FL.stage)||(on&&FL.stage==='DES'&&FL.alt>13000);
  if(std){g.strokeStyle=PC.y;g.lineWidth=2;g.strokeRect(ax1+4,sBot+14,62,30);T('STD',ax1+35,sBot+30,'b',24,'center')}
  else{T('QNH',ax1-8,sBot+30,'w',22);T(String(on&&FL.s>FL.path.sThr/2&&S.p2.qnh!=null?S.p2.qnh:1013),ax1+50,sBot+30,'b',24)}
  /* vertical speed */
  const vx=692,vf=v=>{const a=Math.abs(v),y=a<=1000?a*0.09:a<=2000?90+(a-1000)*0.05:Math.min(190,140+(a-2000)*0.0125);return v>=0?-y:y};
  g.fillStyle=PC.tape;g.beginPath();g.moveTo(vx,cy-200);g.lineTo(vx+30,cy-200);g.lineTo(vx+52,cy-60);g.lineTo(vx+52,cy+60);g.lineTo(vx+30,cy+200);g.lineTo(vx,cy+200);g.closePath();g.fill();
  [500,1000,1500,2000,6000].forEach(v=>{[1,-1].forEach(sg=>L(vx+2,cy+vf(sg*v),vx+12,cy+vf(sg*v),'w',2.5))});T('1',vx+18,cy+vf(1000),'w',18);T('2',vx+18,cy+vf(2000),'w',18);T('6',vx+18,cy+vf(6000),'w',18);
  T('1',vx+18,cy+vf(-1000),'w',18);T('2',vx+18,cy+vf(-2000),'w',18);T('6',vx+18,cy+vf(-6000),'w',18);
  L(vx+70,cy,vx+6,cy+vf(vs),'g',4);if(Math.abs(vs)>=200){const yy=cy+vf(vs)+(vs>0?-18:18);g.fillStyle='#000';g.fillRect(vx+10,yy-13,34,26);T(String(Math.round(Math.abs(vs)/100)).padStart(2,'0'),vx+27,yy,'g',22,'center')}

  /* ---- heading tape ---- */
  const hy=Hg-92,hx1=cx-170,hx2=cx+170,hpx=7.5;
  g.save();g.beginPath();g.rect(hx1,hy,hx2-hx1,50);g.clip();g.fillStyle=PC.tape;g.fillRect(hx1,hy,hx2-hx1,50);
  for(let h=Math.floor((hdgM-25)/5)*5;h<=hdgM+25;h+=5){const x=cx+(h-hdgM)*hpx;L(x,hy,x,hy+(h%10?10:16),'w',2.5);if(h%10===0){const n=((h%360)+360)%360/10;T(String(n),x,hy+32,'w',n%3===0?28:22,'center')}}
  g.restore();L(cx,hy-14,cx,hy+22,'y',5);
  /* track diamond */
  if(on){g.strokeStyle=PC.g;g.lineWidth=3;g.beginPath();g.moveTo(cx,hy+20);g.lineTo(cx+8,hy+32);g.lineTo(cx,hy+44);g.lineTo(cx-8,hy+32);g.closePath();g.stroke()}
  g.restore()}

/* ---------- 2D PFD (inside the panel photo) ---------- */
const pfdC=$('#pfd'),pfdG=pfdC?pfdC.getContext('2d'):null;
if($('#pfdBezel'))$('#pfdBezel').src=IMG_ND;
function drawPFD2D(){if(!pfdG)return;drawPFD(pfdG,pfdC.width,pfdC.height,true)}
if(pfdC)new ResizeObserver(()=>{const d=devicePixelRatio||1,w=Math.round(pfdC.clientWidth*d),h=Math.round(pfdC.clientHeight*d);
  if(w&&(w!==pfdC.width||h!==pfdC.height)){pfdC.width=w;pfdC.height=h;drawPFD2D()}}).observe(pfdC);
