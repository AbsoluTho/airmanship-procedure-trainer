'use strict';
/* ================= PFD =================
   Drawn in the pixel coordinates of the reference PFD photo (screen 573 x 573, origin 55,39),
   then scaled to the canvas. */
const PC={bg:'#0a0c2b',sky:'#11bafe',gnd:'#c3544e',tape:'#8a8b9f',htape:'#857d82',w:'#ffffff',g:'#3df24e',b:'#3fd2ff',m:'#ff8cf0',a:'#ff9a1f',y:'#ffe600',r:'#ff2020'};
const PF=(px,w)=>`${w||500} ${px}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
function vmaxFor(conf,alt){const v={'0':350,'1':230,'1+F':215,'2':200,'3':185,'FULL':177}[conf]||350;return conf==='0'?Math.min(v,iasOf(0.82*sos(alt),alt)):v}
const VFE_NEXT={'0':230,'1':200,'1+F':200,'2':185,'3':177};
function drawPFD(g,W,H,powered){g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,W,H);if(!powered){g.restore();return}
  const sc=W/592,Hp=H/sc,oy=(Hp-573)/2;g.scale(sc,sc);g.translate(-41,-39+oy);
  g.fillStyle=PC.bg;g.fillRect(41,39-oy,592,Hp);
  const on=flying(),o=orig(),ap=o?DB.apt[o]:DB.apt.OEJN,ac=acState();
  const altT=on?FL.alt:(S.active&&S.active.rwy?(ap.rwy[S.active.rwy].tdze??ap.elev):ap.elev),qAct=actualQnh(),alt=altT+(EFIS.std?(1013-qAct):(baroHpa()-qAct))*27.3;
  const ias=on?FL.ias:0,vs=on?FL.vs:0,pitch=on?FL.pitch:0,roll=on?FL.roll:0;
  const hdgM=((ac.hdg)%360+360)%360,agl=on?FL.alt-groundElev():0;
  const T=(t,x,y,col,px,al,w)=>{g.font=PF(px||20,w);g.fillStyle=PC[col]||col;g.textAlign=al||'left';g.textBaseline='middle';g.fillText(t,x,y)};
  const L=(x1,y1,x2,y2,col,w)=>{g.strokeStyle=PC[col]||col;g.lineWidth=w||2;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
  const box=(x,y,w,h,col,lw)=>{g.strokeStyle=PC[col]||col;g.lineWidth=lw||2;g.strokeRect(x,y,w,h)};
  const CX=300,CY=346,SY=340;   /* sphere centre and aircraft symbol / reference line */

  /* ---- FMA ---- */
  /* before the flight: with INIT B done and the FDs on, the FMA reads CLB and NAV armed (cyan) and 1 FD 2 */
  const preF=!on&&EFIS.fd&&S.fuel&&S.fuel.zfw!=null&&S.fuel.block!=null?{c1:[],c2:[null,['CLB','b']],c3:[null,S.active&&!S.active.noSid&&FCU.hdgMgd!==false?['NAV','b']:null],c4:[],c5:[null,['1 FD 2','w']]}:null;
  const cols=[[55,170],[170,290],[290,423],[423,537],[537,628]],F=preF||FL.fma;
  [170,290,423,537].forEach(x=>L(x,42,x,120,'#c9ccd6',1.5));
  ['c1','c2','c3','c4','c5'].forEach((c,k)=>{const[x1,x2]=cols[k],xm=(x1+x2)/2;(F[c]||[]).forEach((ln,j)=>{if(!ln||!ln[0])return;
    const flash=ln[2]&&Math.floor(FL.t*2)%2===0,fs=k>=3?22:(ln[0].length>7&&k===1?21:25);if(!flash)T(ln[0],xm,60+27*j,ln[1],fs,'center');
    if(j===0&&k<3&&on&&FL.t-(FL.fmaT[c]??-99)<10){g.font=PF(25);const tw=g.measureText(ln[0]).width;box(xm-tw/2-6,45,tw+12,30,'w',1.5)}})});
  if(F.msg)T(F.msg,(55+423)/2,114,'w',23,'center');
  if(F.land){const xm=(170+423)/2;T(F.land,xm,60,'g',25,'center');if(on&&FL.t-(FL.fmaT.land??-99)<10){g.font=PF(25);const tw=g.measureText(F.land).width;box(xm-tw/2-6,45,tw+12,30,'w',1.5)}}

  /* ---- attitude sphere: circle (r 151) cut by straight sides at x 167 and 433 ---- */
  const ppd=6.2;
  g.save();g.beginPath();g.rect(167,150,266,360);g.clip();g.beginPath();g.arc(CX,CY,151,0,Math.PI*2);g.clip();
  g.translate(CX,SY);g.rotate(-roll*D2R);g.translate(0,pitch*ppd);
  g.fillStyle=PC.sky;g.fillRect(-400,-900,800,900);g.fillStyle=PC.gnd;g.fillRect(-400,0,800,900);L(-400,0,400,0,'w',2);
  for(let p=-30;p<=30;p+=2.5){if(!p)continue;const y=-p*ppd,hw=p%10===0?38:p%5===0?20:9;L(-hw,y,hw,y,'w',2);
    if(p%10===0){T(String(Math.abs(p)),-64,y,'w',20,'center');T(String(Math.abs(p)),64,y,'w',20,'center')}}
  /* pitch limits (green =) at +30 and -15 */
  [[30],[-15]].forEach(([p])=>{const y=-p*ppd;[-1,1].forEach(s=>{L(s*48,y-3,s*60,y-3,'g',2);L(s*48,y+3,s*60,y+3,'g',2)})});
  g.restore();
  /* roll scale: ticks only, fixed index at the top */
  g.save();g.translate(CX,CY);
  const tickAt=(a,r1,r2,w)=>{const s=Math.sin(a*D2R),c=Math.cos(a*D2R);L(r1*s,-r1*c,r2*s,-r2*c,'w',w)};
  [-20,-10,10,20].forEach(a=>tickAt(a,160,170,6));[-30,30].forEach(a=>tickAt(a,158,172,6));[-45,45].forEach(a=>tickAt(a,152,174,2.5));
  [-67,67].forEach(a=>{const s=Math.sin(a*D2R),c=Math.cos(a*D2R),nx=c*4,ny=s*4;[-1,1].forEach(k=>L(150*s+k*nx,-150*c+k*ny,162*s+k*nx,-162*c+k*ny,'g',2))});
  g.strokeStyle=PC.y;g.lineWidth=2;g.beginPath();g.moveTo(0,-163);g.lineTo(-9,-178);g.lineTo(9,-178);g.closePath();g.stroke();
  g.rotate(-roll*D2R);g.beginPath();g.moveTo(0,-155);g.lineTo(-9,-141);g.lineTo(9,-141);g.closePath();g.stroke();
  const ss=0;g.beginPath();g.moveTo(-11+ss,-138);g.lineTo(11+ss,-138);g.lineTo(15+ss,-131);g.lineTo(-15+ss,-131);g.closePath();g.stroke();
  g.restore();
  /* FD bars */
  if(EFIS.fd&&!FCU.trkFpa&&!['ROLLOUT','STOP'].includes(FL.stage)){const dr=on?Math.max(-60,Math.min(60,((FL.rollCmd??roll)-roll)*2)):0;L(210,SY,390,SY,'g',3);L(CX+dr,SY-110,CX+dr,SY+70,'g',3)}
  /* flight path vector (bird) in TRK/FPA */
  if(FCU.trkFpa){const fpa=on?Math.atan2(FL.vs,Math.max(60,FL.gs)*101.27)/D2R:0,by=SY+(pitch-fpa)*ppd;g.save();g.translate(CX,by);g.rotate(-roll*D2R);g.strokeStyle=PC.g;g.lineWidth=3;
    g.beginPath();g.arc(0,0,8,0,7);g.moveTo(-8,0);g.lineTo(-26,0);g.moveTo(8,0);g.lineTo(26,0);g.moveTo(0,-8);g.lineTo(0,-18);g.stroke();g.restore()}
  /* aircraft symbol */
  const wing=s=>{const x0=s<0?173:368,x1=s<0?232:427,xs=s<0?222:368;g.fillStyle='#000';g.strokeStyle=PC.y;g.lineWidth=2.5;
    g.beginPath();g.moveTo(x0,334);g.lineTo(x1,334);if(s<0){g.lineTo(x1,360);g.lineTo(xs,360);g.lineTo(xs,346)}else{g.lineTo(x1,346);g.lineTo(xs+11,346);g.lineTo(xs+11,360);g.lineTo(xs,360)}
    if(s<0)g.lineTo(x0,346);g.closePath();g.fill();g.stroke()};
  wing(-1);wing(1);g.fillStyle='#000';g.fillRect(295,335,10,10);g.strokeStyle=PC.y;g.lineWidth=2.5;g.strokeRect(295,335,10,10);
  /* radio altitude */
  if(on&&agl<2500&&!FL.ground){const ra=agl>50?Math.round(agl/10)*10:Math.max(0,Math.round(agl/5)*5);T(String(ra),CX,475,agl<(S.p2.radio>0?S.p2.radio:0)?'a':'g',28,'center')}

  /* ---- ILS deviation (on approach) ---- */
  if((FCU.appr||FCU.loc)&&!EFIS.ls&&Math.floor(Date.now()/500)%2===0)T('LS',215,525,'a',22,'center',700);
  if(EFIS.ls&&hasLsSel()){const d=destRwy(),thr=d.r.pos,crsT=d.r.crs+(d.a.var||0),pos0=on?FL.pos:acState().pos,alt0=alt,dist=gc(pos0,thr);
    const ang=((brg(pos0,thr)-crsT+540)%360)-180,locDots=Math.max(-2.2,Math.min(2.2,-ang/0.8));
    const gsAng=Math.atan2(alt0-(d.tdze+50),Math.max(0.1,dist)*6076)/D2R,gsDots=Math.max(-2.2,Math.min(2.2,(gsAng-3)/0.4)),rx=dist<25&&Math.abs(ang)<35;
    for(let k=-2;k<=2;k++)if(k){g.strokeStyle=PC.w;g.lineWidth=2;g.beginPath();g.arc(CX+k*36,512,4,0,7);g.stroke();g.beginPath();g.arc(450,SY-k*36,4,0,7);g.stroke()}
    L(CX,502,CX,522,'y',3);L(440,SY,460,SY,'y',3);
    const dia=(x,y,hz)=>{g.strokeStyle=PC.m;g.lineWidth=2.5;g.beginPath();if(hz){g.moveTo(x-12,y);g.lineTo(x,y-7);g.lineTo(x+12,y);g.lineTo(x,y+7)}else{g.moveTo(x,y-12);g.lineTo(x+7,y);g.lineTo(x,y+12);g.lineTo(x-7,y)}g.closePath();g.stroke()};
    if(rx){dia(CX+locDots*36,512,true);dia(450,SY+gsDots*36,false)}
    const ap2=S.active&&S.active.appr&&(APPRS[destId()]||{})[S.active.appr];T(ap2?ap2.nav:'',62,560,'m',18);T(dist.toFixed(1)+'NM',62,582,'m',18)}

  /* ---- speed tape (x 55-119, y 182-497, 3.69 px/kt) ---- */
  const sv=Math.max(30,ias),kpx=3.69,sy=v=>SY-(v-sv)*kpx;
  g.save();g.beginPath();g.rect(55,182,90,315);g.clip();g.fillStyle=PC.tape;g.fillRect(55,182,64,315);
  for(let v=Math.floor((sv-50)/10)*10;v<=sv+50;v+=10){if(v<30)continue;const y=sy(v);L(108,y,119,y,'w',2.5);if(v%20===0)T(String(v),97,y,'w',21,'right')}
  if(on&&!FL.ground){const sp=cfgSpeeds(),vmax=Math.min(vmaxFor(FL.conf,FL.alt),FL.gear?280:999);   /* VFE of the configuration, VLE 280 with the gear down */
    for(let y=sy(vmax);y>170;y-=14){g.fillStyle=PC.r;g.fillRect(119,y-14,8,7);g.fillStyle='#000';g.fillRect(119,y-7,8,7)}
    const vfe=VFE_NEXT[FL.conf];if(vfe){const y=sy(vfe);L(108,y-2,118,y-2,'a',2);L(108,y+2,118,y+2,'a',2)}
    /* VLS (amber), alpha prot (amber/black), VSW (red) */
    const vl=sp.VLS,ap_=vl-8,vsw=vl-14;L(122,sy(vl),122,sy(ap_),'a',2.5);
    for(let y=sy(ap_);y<sy(vsw);y+=10){g.fillStyle=PC.a;g.fillRect(120,y,8,5);g.fillStyle='#000';g.fillRect(120,y+5,8,5)}
    g.fillStyle=PC.r;g.fillRect(120,sy(vsw),8,520-sy(vsw));
    FL._cs={conf:FL.conf,GD:sp.GD,S:sp.S,F:sp.F}}
  if(on&&FL.ground&&['LINEUP','ROLL'].includes(FL.stage)){if(S.perf.v1)T('1',124,sy(S.perf.v1),'b',22);   /* the pilot's V speeds: V1 '1', VR circle, V2 target */
    /* VR: cyan hollow circle, a little smaller than the green dot */
    if(S.perf.vr){g.strokeStyle=PC.b;g.lineWidth=2.5;g.beginPath();g.arc(129,sy(S.perf.vr),4,0,7);g.stroke()}}
  g.restore();
  L(55,182,135,182,'w',2);L(55,497,135,497,'w',2);L(119,182,119,497,'w',2);
  /* characteristic speeds, drawn in front of the attitude so they are not cut */
  if(on&&!FL.ground&&FL._cs){const c=FL._cs,inT=y=>y>186&&y<493;
    if(c.conf==='0'){const y=sy(c.GD);if(inT(y)){g.strokeStyle=PC.g;g.lineWidth=2.5;g.beginPath();g.arc(129,y,5,0,7);g.stroke()}}
    else if(c.conf==='1'||c.conf==='1+F'){const y=sy(c.S);if(inT(y)){L(120,y,131,y,'g',2.5);g.fillStyle=PC.bg;g.fillRect(134,y-11,16,22);T('S',142,y,'g',22,'center')}}
    else if(c.conf==='2'||c.conf==='3'){const y=sy(c.F);if(inT(y)){L(120,y,131,y,'g',2.5);g.fillStyle=PC.bg;g.fillRect(134,y-11,16,22);T('F',142,y,'g',22,'center')}}}
  /* target speed: magenta triangle, or the value above or below the tape */
  const sel=!FCU.spdMgd&&FCU.spd!=null&&!(on&&(FL.stage==='ROLL'||FL.ver==='SRS')),tc=sel?'b':'m';
  const tgt=sel?Math.round(FCU.mach?iasOf(FCU.spd*sos(alt),alt):FCU.spd):on?Math.round(['LINEUP','ROLL'].includes(FL.stage)?S.perf.v2:(FL.ver==='SRS'&&S.phase!=='GA'?S.perf.v2:FL.ver==='SRS'?FL.gaSpd||S.perf.v2+10:(FL.spdT??FL.ias))):(S.perf.v2||null);
  /* above the tape: SPEED or MACH and the target in that unit (magenta managed, cyan selected) */
  const isM=on&&!FL.ground&&FL.ver!=='SRS'&&!!FL.spdIsMach,mTgt=isM?(sel?FCU.spd:FL.ver==='EXP DES'?0.80:mgd.crzM()):null;
  if(on&&!FL.ground&&tgt){T(isM?'MACH':'SPEED',87,140,'w',19,'center');T(isM?'.'+String(Math.round(mTgt*100)).padStart(2,'0'):String(tgt),87,166,tc,23,'center')}
  if(tgt){const y=sy(tgt);if(y<182){if(!(on&&!FL.ground))T(String(tgt),120,170,tc,20,'center')}else if(y>497)T(String(tgt),120,510,tc,20,'center');
    else{g.fillStyle=PC[tc];g.beginPath();g.moveTo(121,y);g.lineTo(135,y-8);g.lineTo(135,y+8);g.closePath();g.fill()}}
  /* speed reference and trend */
  L(47,SY,57,SY,'y',4);L(102,SY,122,SY,'y',3);g.fillStyle=PC.y;g.beginPath();g.moveTo(121,SY);g.lineTo(137,SY-7);g.lineTo(137,SY+7);g.closePath();g.fill();
  /* speed trend: speed in 10 s, shown when it differs by more than 2 kt (takeoff roll and landing roll included) */
  if(on&&FL.ias>=30&&FL.stage!=='STOP'){const dy=Math.max(-150,Math.min(150,(FL.acc||0)*10*kpx));
    if(Math.abs(dy)>2*kpx){L(104,SY,104,SY-dy,'y',2.5);const s=Math.sign(dy);g.strokeStyle=PC.y;g.lineWidth=2.5;g.beginPath();g.moveTo(98,SY-dy+s*8);g.lineTo(104,SY-dy);g.lineTo(110,SY-dy+s*8);g.stroke()}}
  if(on&&FL.mach>0.5)T('.'+Math.round(FL.mach*100),88,522,'g',22,'center');

  /* ---- altitude tape (x 477-526, y 182-497, 0.278 px/ft) ---- */
  const apx=0.278,ay=v=>SY-(v-alt)*apx;
  g.save();g.beginPath();g.rect(460,182,70,315);g.clip();g.fillStyle=PC.tape;g.fillRect(477,182,49,315);
  for(let v=Math.floor((alt-650)/100)*100;v<=alt+650;v+=100){const y=ay(v);L(515,y,526,y,'w',2);
    if(v%500===0&&v>=0){T(String(Math.round(v/100)).padStart(3,'0'),488,y,'w',21);g.strokeStyle=PC.w;g.lineWidth=2;g.beginPath();g.moveTo(471,y-5);g.lineTo(477,y);g.lineTo(471,y+5);g.stroke()}}
  g.restore();
  L(477,182,543,182,'w',2);L(477,497,543,497,'w',2);L(526,182,526,497,'w',2);
  /* target altitude (cyan) on the tape, drawn before the readout window so it never crosses the present altitude */
  /* an altitude constraint that is the next level-off replaces it, in magenta */
  const cstT=on&&typeof cstTarget==='function'?cstTarget():null,tgtA=cstT??FCU.alt,tgtC=cstT!=null?'m':'b';
  {const fcu=tgtA,y=ay(fcu);if(y>=182&&y<=497){g.save();g.beginPath();g.rect(477,182,49,315);g.clip();g.strokeStyle=PC[tgtC];g.lineWidth=2.5;g.strokeRect(478,y-10,46,20);g.restore()}}
  /* vertical deviation (green dot): the managed descent path on the altitude tape; low dot = aircraft above the path */
  /* also in cruise from 25 NM before T/D: the path comes down from the top of the tape and meets the aircraft at T/D */
  if(on&&!FL.ground&&(['DES','APPR'].includes(S.phase)||S.phase==='CRZ'&&(FL.s>=FL.td-25||DESCENDING.includes(FL.ver)))&&!['G/S*','G/S','LAND','FLARE','ROLL OUT'].includes(FL.ver)&&FL.path){const dtg=FL.path.sThr-FL.s;
    if(dtg>0.5){const pa=profileAlt(dtg)+(alt-FL.alt),y=Math.max(196,Math.min(484,ay(pa)));g.fillStyle=PC.g;g.beginPath();g.arc(470,y,6.5,0,7);g.fill()}}
  /* readout window: black band with yellow top and bottom, drum box on the right */
  g.fillStyle='#000';g.fillRect(477,323,49,34);g.fillRect(526,313,32,54);
  L(477,323,526,323,'y',2.5);L(477,357,526,357,'y',2.5);box(526,313,32,54,'y',2.5);
  const a0=Math.max(0,alt),big=String(Math.floor(a0/100)),d20=Math.floor((a0%100)/20)*20;
  T(big,523,SY,'g',30,'right');
  g.save();g.beginPath();g.rect(527,314,30,52);g.clip();const frac=((a0%20)/20)*16;
  [-2,-1,0,1,2].forEach(k=>{const v=((d20+k*20)%100+100)%100;T(String(v).padStart(2,'0'),542,SY-k*16+frac,'g',18,'center')});g.restore();
  L(440,SY,470,SY,'y',5);
  if(FCU.metric){const m=Math.round(alt*0.3048/10)*10,tm=Math.round(FCU.alt*0.3048/10)*10;g.fillStyle='#000';g.fillRect(478,286,64,24);box(478,286,64,24,'y',1.5);T(m+'M',540,298,'g',17,'right');T(tm+'M',540,150,'b',17,'right')}
  /* target altitude and baro reference */
  const fcu=tgtA;
  if(fcu!=null){const t=fcu>=(TA[o]||13000)?'FL'+String(Math.round(fcu/100)).padStart(3,'0'):String(Math.round(fcu)),y=ay(fcu);
    if(y<182)T(t,517,166,tgtC,27,'center');else if(y>497)T(t,517,514,tgtC,27,'center')}
  {const ta=TA[o]||13000,tl=(TA[destId()]||13000)+2000,blink=Math.floor(Date.now()/500)%2===0;
   const climbAbove=on&&!EFIS.std&&altT>ta+200&&['CLB','CRZ'].includes(S.phase),descBelow=on&&EFIS.std&&altT<tl-200&&['DES','APPR'].includes(S.phase);
   if(EFIS.std){if(!(descBelow&&blink)){box(492,530,56,26,'y',2);T('STD',520,543,'b',20,'center')}}
   else if(!(climbAbove&&blink)){T('QNH',480,543,'w',20);T(EFIS.inhg?(baroHpa()*0.02953).toFixed(2):String(Math.round(baroHpa())),537,543,'b',20)}}

  /* ---- vertical speed (x 582-617) ---- */
  const vf=v=>{const a=Math.abs(v),y=a<=1000?a*0.1:a<=2000?100+(a-1000)*0.039:Math.min(174,139+(a-2000)*0.00875);return v>=0?-y:y};
  g.fillStyle=PC.tape;g.beginPath();g.moveTo(582,155);g.lineTo(602,155);g.lineTo(615,200);g.lineTo(615,480);g.lineTo(602,525);g.lineTo(582,525);g.closePath();g.fill();
  [[1000,'1'],[2000,'2'],[6000,'6']].forEach(([v,t])=>[1,-1].forEach(s=>{const y=SY+vf(s*v);T(t,592,y,'w',18,'center');g.fillStyle=PC.w;g.fillRect(598,y-2,6,4)}));
  [500,1500,4000].forEach(v=>[1,-1].forEach(s=>{const y=SY+vf(s*v);L(596,y,604,y,'w',2)}));
  L(580,SY,600,SY,'y',5);
  const ny=SY+vf(vs);L(655,SY,598,ny,'g',3.5);
  if(Math.abs(vs)>=200){const yy=ny+(vs>0?-8:8);g.fillStyle=PC.bg;g.fillRect(600,yy-10,26,20);T(String(Math.round(Math.abs(vs)/100)).padStart(2,'0'),613,yy,'g',18,'center')}

  /* ---- heading tape (x 168-434, y 579-614, 5.5 px/deg) ---- */
  const hpx=5.5;g.save();g.beginPath();g.rect(168,579,266,35);g.clip();g.fillStyle=PC.htape;g.fillRect(168,579,266,35);
  for(let h=Math.floor((hdgM-30)/5)*5;h<=hdgM+30;h+=5){const x=CX+(h-hdgM)*hpx;L(x,579,x,579+(h%10?6:10),'w',2);
    if(h%10===0){const n=((h%360)+360)%360/10;T(String(n),x,600,'w',20,'center')}}
  g.restore();L(CX,556,CX,590,'y',5);
  const dTrk=on?((FL.trkT-(FL.hdgT))):0;g.strokeStyle=PC.g;g.lineWidth=2.5;const tx=CX+dTrk*hpx;g.beginPath();g.moveTo(tx,578);g.lineTo(tx+6,586);g.lineTo(tx,594);g.lineTo(tx-6,586);g.closePath();g.stroke();
  /* selected heading (FCU later): value at the side when off scale */
  const shv=selHdgVal(),dh=shv==null?0:((shv-hdgM+540)%360)-180;if(shv==null){}else if(Math.abs(dh)>24)T(String(shv).padStart(3,'0'),dh<0?182:418,568,'b',18,'center');
  else{g.fillStyle=PC.b;const x=CX+dh*hpx;g.beginPath();g.moveTo(x,578);g.lineTo(x-6,568);g.lineTo(x+6,568);g.closePath();g.fill()}
  g.restore()}

/* ---------- 2D PFD (inside the display-unit photo) ---------- */
const pfdC=$('#pfd'),pfdG=pfdC?pfdC.getContext('2d'):null;
if($('#pfdBezel'))$('#pfdBezel').src=IMG_ND;
function drawPFD2D(){if(!pfdG)return;drawPFD(pfdG,pfdC.width,pfdC.height,true)}
if(pfdC)new ResizeObserver(()=>{const d=devicePixelRatio||1,w=Math.round(pfdC.clientWidth*d),h=Math.round(pfdC.clientHeight*d);
  if(w&&(w!==pfdC.width||h!==pfdC.height)){pfdC.width=w;pfdC.height=h;drawPFD2D()}}).observe(pfdC);
