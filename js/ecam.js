'use strict';
/* ================= ECAM: upper display (E/WD) and lower display (SD) =================
   Shown in the MCDU slot, behind the MCDU (MCDU / ECAM switch). Values come from the
   simplified flight model (engines, fuel, configuration, flight phase); systems that are not
   simulated are shown in their normal state. Layouts follow the A320 ECAM in a simplified
   form, for procedure training only. */
const EC={on:false,ecp:false,page:null,manual:false,toCfg:false,toCfgT:-99,stsT:-99,eng:[null,null],t:null,allIx:0};
const SD_ORDER=['eng','bleed','press','elec','hyd','fuel','apu','cond','door','wheel','fctl'];
const SD_TITLE={eng:'ENGINE',bleed:'BLEED',press:'CAB PRESS',elec:'ELEC',hyd:'HYD',fuel:'FUEL',apu:'APU',cond:'COND',door:'DOOR/OXY',wheel:'WHEEL',fctl:'F/CTL',sts:'STATUS',crz:'CRUISE'};
const EC_C={w:'#ffffff',g:'#3df24e',b:'#3fd2ff',a:'#ff9a1f',m:'#ff8cf0',r:'#ff2020',gr:'#8a8b9f',bg:'#000'};

/* ---------- engine model (N1, N2, EGT, FF) from the thrust and vertical modes ---------- */
function engTarget(){const on=flying(),alt=on?FL.alt:elevO(),q=S.perf,flx=q.flex!=null&&S.phase!=='GA';
  if(!on||FL.stage==='STOP'||FL.stage==='IDLE')return{n1:19.6,n2:58.9,egt:395,ff:290};
  if(FL.stage==='ROLLOUT')return{n1:FL.ias>70?71:21,n2:FL.ias>70?88:60,egt:FL.ias>70?560:420,ff:FL.ias>70?1300:300};
  if(FL.thr==='TO')return flx?{n1:Math.max(80,92.4-(q.flex-30)*0.26),n2:96.2,egt:715,ff:2750}:{n1:92.8,n2:98.4,egt:760,ff:3000};
  const climb=CLIMBING.includes(FL.ver)||FL.ver==='SRS'||(['V/S','FPA'].includes(FL.ver)&&FL.vs>500);
  if(climb)return{n1:Math.min(91.5,87.4+alt/1e4*1.2),n2:94+alt/1e4*0.8,egt:690-alt/1e4*25,ff:Math.max(1050,1650-alt/1e4*180)};
  if(DESCENDING.includes(FL.ver)||FL.vs<-1200&&FL.ias>=(FL.spdT||0)-3)return{n1:21+alt/1e4*3.6,n2:62+alt/1e4*3,egt:430+alt/1e4*20,ff:280+alt/1e4*25};
  const gw=gwNowF(),k=gw/64;
  if(alt>20000)return{n1:58+alt/34000*25*k,n2:84+alt/34000*7,egt:520+alt/34000*90,ff:FL.ver==='ALT'||FL.ver.startsWith('ALT')?(PM.ff(I().crz,I().ci)*PM.wf(gw)*500):1100};
  const conf=FL.conf==='0'?0:FL.conf==='FULL'?4:+FL.conf[0]||1,fpa=FL.vs/Math.max(100,FL.gs)/101.27*57.3;
  return{n1:Math.max(30,52+conf*2.5+fpa*6+alt/1e4*6),n2:78+conf,egt:500+conf*10,ff:Math.max(350,900+conf*80+fpa*240)}}
function engStep(){const tg=engTarget(),t=flying()?FL.t:0,dt=EC.t==null?99:Math.max(0,t-EC.t);EC.t=t;
  for(let i=0;i<2;i++){const e=EC.eng[i];if(!e||dt>60||!flying()){EC.eng[i]=Object.assign({},tg);continue}
    const mv=(k,r)=>{e[k]+=Math.max(-r*dt,Math.min(r*dt,tg[k]-e[k]))};mv('n1',6);mv('n2',4);mv('egt',30);mv('ff',400)}
  /* small difference between the engines, as on the aircraft */
  /* a failed engine (training failure from the flight bar) windmills: low N1 and N2, cooling EGT, no fuel flow */
  return EC.eng.map((e,i)=>flying()&&FL.eoEng===i+1?{n1:Math.min(e.n1,4+FL.ias*0.012),n2:Math.min(e.n2,10+FL.ias*0.04),egt:Math.min(e.egt,Math.max(satC()+40,120)),ff:0,fail:true}
    :{n1:e.n1+(i?0.2:0),n2:e.n2+(i?0.3:0),egt:e.egt+(i?6:0),ff:e.ff+(i?10:0)})}

/* ---------- shared figures ---------- */
const fobKg=()=>Math.round((flying()?FL.fob:(S.fuel.block!=null?S.fuel.block:null))*1000);
function tanks(kg){/* fill order outer, inner, centre; used in reverse */let r=kg;const o=Math.min(r/2,691);r-=2*o;const n=Math.min(r/2,5436);r-=2*n;return{o,n,c:Math.max(0,r)}}
const isaAt=a=>15-1.98*Math.min(36089,a)/1000;
function satC(){const alt=flying()?FL.alt:elevO(),dev=I().temp!=null&&I().crz?I().temp-isaAt(I().crz*100):10;return isaAt(alt)+dev}
function cabin(){const on=flying()&&!FL.ground,alt=on?FL.alt:elevO(),o=elevO(),d=(S.active&&idxK(S.active,'dest')>0)?destRwy().tdze:o;
  if(!on)return{alt:Math.round(o/10)*10,vs:0,dp:0,ldg:d};
  const ca=Math.max(Math.min(o,d)-200,Math.min(8000,alt*0.19+(S.phase==='CLB'||S.phase==='TAKEOFF'?o*0.5:d*0.6)));
  const dp=Math.max(0,(14.7*Math.exp(-ca/27000))-(14.7*Math.exp(-alt/27000)));return{alt:Math.round(ca/10)*10,vs:Math.round(FL.vs*0.15/10)*10,dp,ldg:d}}

/* ---------- automatic SD page (flight phase) ---------- */
function autoPage(){if(!flying())return'wheel';
  const agl=FL.alt-groundElev();if(FL.stage==='ROLL'||FL.thr==='TO'||(!FL.ground&&agl<1500&&S.phase==='TAKEOFF'))return'eng';
  if(FL.ground)return'wheel';if(FL.gear&&S.phase==='APPR')return'wheel';return'crz'}
const sdPage=()=>EC.page||autoPage();

/* ---------- drawing helpers: drawn in the pixel coordinates of the reference photo (screen x0,y0,w,h) ---------- */
function ecTools(g,f){const F=px=>`500 ${Math.round(px*f)}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
  const T=(t,x,y,col,px,al,w)=>{g.font=F(px||22).replace('500',String(w||500));g.fillStyle=EC_C[col]||col;g.textAlign=al||'left';g.textBaseline='middle';g.fillText(t,x,y)};
  const L=(pts,col,w)=>{g.strokeStyle=EC_C[col]||col;g.lineWidth=w||2.5;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()};
  const R=(x,y,w,h,col,lw)=>{g.strokeStyle=EC_C[col]||col;g.lineWidth=lw||2;g.strokeRect(x,y,w,h)};
  const title=(t,x,y,px,al)=>{T(t,x,y,'w',px||26,al);g.font=F(px||26);const w=g.measureText(t).width,x0=al==='center'?x-w/2:x;L([[x0,y+(px||26)*0.62],[x0+w,y+(px||26)*0.62]],'w',1.8)};
  return{g,T,L,R,title,F}}
function ecCtx(c,x0,y0,w,h){const g=c.getContext('2d'),s=c.width/w;g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);
  g.setTransform(s,0,0,c.height/h,-x0*s,-y0*c.height/h);g.lineCap='round';g.lineJoin='round';return ecTools(g,1)}
/* dotted memo line: action in cyan with dots, or the done item in green */
function memo(D,x,y,a,b,done,end){const{T,g,F}=D;if(done){T(a+' '+b,x,y,'g',17);return}T(a,x,y,'b',17);g.font=F(17);
  const w=g.measureText(a).width,bw=g.measureText(b).width,e=end||x+262;T('.'.repeat(Math.max(2,Math.floor((e-bw-x-w-4)/4.7))),x+w+2,y,'b',17);T(b,e,y,'b',17,'right')}

/* ---------- E/WD (reference photo: screen x 76-598, y 82-592) ---------- */
function drawEWD(c){const D=ecCtx(c,76,82,522,510),{g,T,L,R}=D,E=engStep(),q=S.perf,on=flying();
  const flx=q.flex!=null&&S.phase!=='GA',tl=!on||FL.thr==='TO'?(flx?'FLX':'TOGA'):'CLB',n1l=tl==='FLX'?Math.max(80,92.4-(q.flex-30)*0.26):tl==='TOGA'?92.8:Math.min(91.5,87.4+(on?FL.alt:0)/1e4*1.2);
  const tla=!on||FL.stage==='STOP'||FL.stage==='ROLLOUT'?0:FL.thr==='TO'?n1l:Math.min(91.5,87.4+FL.alt/1e4*1.2);   /* thrust lever position (cyan circle) */
  const pol=(cx,cy,r,a)=>[cx+Math.cos(a)*r,cy-Math.sin(a)*r];
  /* N1: arc from idle (lower left) to 110 %, red above 100 %, amber N1 limit, cyan thrust lever, green needle, readout box */
  const n1a=v=>(215-Math.max(0,Math.min(110,v))/100*190)*Math.PI/180;
  [222,432].forEach((cx,i)=>{const cy=150,r=43,n=E[i].n1;
    g.strokeStyle=EC_C.w;g.lineWidth=2.4;g.beginPath();g.arc(cx,cy,r,-n1a(0),-n1a(100));g.stroke();
    g.strokeStyle=EC_C.r;g.lineWidth=3.5;g.beginPath();g.arc(cx,cy,r,-n1a(100),-n1a(110));g.stroke();
    [[0,'',8],[50,'5',8],[100,'10',8]].forEach(([v,l,k])=>{L([pol(cx,cy,r,n1a(v)),pol(cx,cy,r-k,n1a(v))],'w',2);if(l)T(l,...pol(cx,cy,r-16,n1a(v)),'w',13,'center')});
    L([pol(cx,cy,r+1,n1a(n1l)),pol(cx,cy,r+9,n1a(n1l))],'a',4);
    g.strokeStyle=EC_C.b;g.lineWidth=2;g.beginPath();g.arc(...pol(cx,cy,r,n1a(tla)),3.5,0,7);g.stroke();
    L([pol(cx,cy,4,n1a(n)),pol(cx,cy,r-2,n1a(n))],'g',3.2);
    g.fillStyle='#000';g.fillRect(cx-11,cy+5,64,22);R(cx-11,cy+5,64,22,'#7d8296',1.6);
    const t=(Math.floor(n*10)/10).toFixed(1);T(t.slice(0,-1),cx+40,cy+17,'g',19,'right');T(t.slice(-1),cx+41,cy+18,'g',14)});
  T('N1',330,152,'w',18,'center');T('%',330,170,'b',15,'center');
  /* EGT */
  const ea=v=>(180-Math.max(0,Math.min(1100,v))/1100*180)*Math.PI/180;
  [222,432].forEach((cx,i)=>{const cy=230,r=38,v=E[i].egt;g.strokeStyle=EC_C.w;g.lineWidth=2.4;g.beginPath();g.arc(cx,cy,r,-ea(0),-ea(1060));g.stroke();
    g.strokeStyle=EC_C.r;g.lineWidth=3.5;g.beginPath();g.arc(cx,cy,r,-ea(1060),-ea(1100));g.stroke();L([pol(cx,cy,r+1,ea(915)),pol(cx,cy,r+8,ea(915))],'a',3);
    L([pol(cx,cy,r*0.55,ea(v)),pol(cx,cy,r-1,ea(v))],'g',3.2);g.fillStyle='#000';g.fillRect(cx-22,cy-11,47,22);R(cx-22,cy-11,47,22,'#7d8296',1.6);T(String(Math.round(v/5)*5),cx+21,cy+1,'g',19,'right')});
  T('EGT',330,220,'w',18,'center');T('°C',330,238,'b',15,'center');
  /* N2 and FF with the slanted label lines */
  [[0,247],[1,457]].forEach(([i,x])=>{const n2=E[i].n2.toFixed(1);T(n2.slice(0,-1),x-9,287,'g',19,'right');T(n2.slice(-1),x-8,288,'g',14);T(String(Math.round(E[i].ff/10)*10),x+5,334,'g',19,'right')});
  T('N2',330,276,'w',18,'center');T('%',330,294,'b',15,'center');L([[281,289],[311,281]],'w',1.8);L([[350,281],[380,289]],'w',1.8);
  T('FF',330,323,'w',18,'center');T('KG/H',330,341,'b',15,'center');L([[281,337],[311,329]],'w',1.8);L([[350,329],[380,337]],'w',1.8);
  /* thrust limit */
  T(tl,515,97,'b',18);T(n1l.toFixed(1).slice(0,-1),556,117,'g',18,'right');T(n1l.toFixed(1).slice(-1),557,118,'g',14);T('%',566,117,'b',15);if(tl==='FLX')T(q.flex+'°C',575,137,'b',15,'right');
  /* slats and flaps */
  const cf=on?FL.conf:(q.flaps===1?'1+F':String(q.flaps||0)),si={'0':0,'1':1,'1+F':1,'2':2,'3':2,'FULL':3}[cf]??0,fi={'0':0,'1':0,'1+F':1,'2':2,'3':3,'FULL':4}[cf]??0;
  const wx=440,wy=380;g.lineWidth=2;g.strokeStyle=EC_C.g;g.beginPath();g.moveTo(wx-18,wy+6);g.lineTo(wx-12,wy-4);g.lineTo(wx+14,wy-4);g.lineTo(wx+20,wy+6);g.closePath();g.stroke();
  L([[wx-26,wy+8],[wx-18,wy+6]],cf==='0'?'g':'w',2);L([[wx+20,wy+6],[wx+28,wy+8]],cf==='0'?'g':'w',2);
  if(cf!=='0'){for(let k=1;k<=3;k++){g.fillStyle=EC_C.w;g.beginPath();g.arc(wx-26-k*10,wy+8+k*6,2,0,7);g.fill()}for(let k=1;k<=4;k++){g.fillStyle=EC_C.w;g.beginPath();g.arc(wx+28+k*9,wy+8+k*6,2,0,7);g.fill()}
    L([[wx-26,wy+8],[wx-26-si*10,wy+8+si*6]],'g',4);L([[wx+28,wy+8],[wx+28+fi*9,wy+8+fi*6]],'g',4);T('S',wx-70,wy+10,'w',15,'center');T('F',wx+80,wy+10,'w',15,'center');T(cf,wx,wy+28,'g',18,'center')}
  /* FOB */
  const fob=fobKg(),ok=fob!=null&&!isNaN(fob);T('FOB :',84,406,'w',18);T(ok?String(Math.round(fob/10)*10):'XX',210,406,ok?'g':'a',19,'right');T('KG',232,407,'b',16);
  /* memo area */
  L([[76,423],[378,423]],'w',2);L([[427,423],[598,423]],'w',2);L([[402,432],[402,570]],'w',2);
  const agl=on?FL.alt-groundElev():0,x0=84,y0=438,dy=18.5;
  if(!on){[['AUTO BRK','MAX',true],['SIGNS','ON',true],['CABIN','CHECK',true],['SPLRS','ARM',true],['FLAPS','T.O',!!q.flaps],['T.O CONFIG','TEST',EC.toCfg]].forEach(([a,b,d],k)=>{
      if(k===0)T('T.O',x0,y0,'w',17);if(k===5&&d)T('T.O CONFIG NORMAL',x0+36,y0+k*dy,'g',17);else memo(D,x0+36,y0+k*dy,a,d&&b==='CHECK'?'READY':b,d,360)})}
  else if(S.phase==='APPR'&&agl<2000&&!FL.ground){const full=!S.p2.conf3;
    [['LDG GEAR','DN',FL.gear],['SIGNS','ON',true],['CABIN','READY',true],['SPLRS','ARM',true],['FLAPS',full?'FULL':'CONF 3',FL.conf===(full?'FULL':'3')]].forEach(([a,b,d],k)=>{if(k===0)T('LDG',x0,y0,'w',17);memo(D,x0+36,y0+k*dy,a,b,d,360)})}
  const rm=[];if(on&&(FL.thr==='TO'||(!FL.ground&&agl<1500&&S.phase==='TAKEOFF')))rm.push(['T.O INHIBIT','m']);
  if(on&&(!FL.ground&&S.phase==='APPR'&&agl<800||FL.stage==='ROLLOUT'))rm.push(['LDG INHIBIT','m']);
  if(on&&FL.stage==='ROLLOUT')rm.push(['GND SPLRS','g']);
  if(!on)rm.push(['PARK BRK','g']);
  if(on&&FCU.athr===false&&FL.stage==='AIR')rm.push(['A/THR OFF','a']);
  rm.forEach(([t,c],k)=>T(t,426,y0+k*dy,c,17))}

/* ---------- SD ---------- */
/* ---------- SD (reference photo: screen x 77-598, y 68-562; permanent data below y 497) ---------- */
function drawSD(c){const P=ecCtx(c,77,68,521,494),pg=sdPage(),on=flying(),E=EC.eng[0]?EC.eng:engStep();
  /* pages ported from FlyByWire are drawn as SVG over the screen (sdpages.js); the canvas keeps the permanent data */
  const ov=$('#sdsvg'),ported=typeof sdPageSvg==='function'&&window.SDP_PORTED.includes(pg);if(ov){const h=ported?sdPageSvg(pg):'';if(ov._h!==h){ov.innerHTML=h;ov._h=h}}
  if(!ported)P.title(SD_TITLE[pg],338,85,19,'center');
  const g=P.g;g.save();const k=0.838;g.translate(77+(521-600*k)/2,78);g.scale(k,k);const D=ecTools(g,1.12),{T,L,R}=D;
  const used=Math.max(0,((S.fuel.block??0)-(S.fuel.taxi??0.2)-(on?FL.fob:(S.fuel.block??0)-(S.fuel.taxi??0.2)))*1000)+(on?0:0);
  const fu=[Math.round(used/2/10)*10,Math.round(used/2/10)*10+(used>0?10:0)];
  const eng2=(lbl,unit,y,v,col)=>{T(lbl,300,y,'w',21,'center');if(unit)T(unit,300,y+22,'b',18,'center');v.forEach((x,i)=>T(x,i?440:160,y+(unit?11:0),col||'g',26,'center'))};
  const cab=cabin();
  if(ported){}
  else if(pg==='crz'){T('ENG',40,75,'w',22);eng2('F.USED','KG',100,fu.map(String));eng2('OIL','QT',160,['14.5','14.0']);
    eng2('VIB  (N1)','',220,[(0.6).toFixed(1),(0.7).toFixed(1)]);eng2('VIB  (N2)','',252,['0.9','1.0']);
    L([[20,285],[580,285]],'gr',1.5);T('AIR',40,310,'w',22);T('LDG ELEV',260,310,'w',20);T('AUTO',372,310,'g',20);T(String(Math.round(cab.ldg/50)*50),510,310,'g',24,'right');T('FT',518,310,'b',18);
    T('ΔP',60,360,'w',22);T(cab.dp.toFixed(1),150,360,'g',26,'right');T('PSI',158,360,'b',18);
    T('CAB V/S',330,360,'w',20);T(String(cab.vs),520,360,'g',26,'right');T('FT/MIN',525,385,'b',16,'right');
    T('CAB ALT',330,415,'w',20);T(String(cab.alt),520,415,'g',26,'right');T('FT',528,415,'b',18);
    T('CKPT',70,455,'w',20,'center');T('FWD',170,455,'w',20,'center');T('AFT',270,455,'w',20,'center');['22','23','23'].forEach((x,i)=>T(x,70+i*100,482,'g',24,'center'));T('°C',320,482,'b',18)}
  else if(pg==='eng'){eng2('F.USED','KG',80,fu.map(String));eng2('OIL','QT',140,['14.5','14.0']);
    const op=E.map(e=>Math.round(25+e.n2*0.45));eng2('OIL PSI','',200,op.map(String));eng2('OIL °C','',240,E.map(e=>String(Math.round(60+e.n2*0.35))));
    eng2('VIB N1','',290,['0.6','0.7']);eng2('VIB N2','',325,['0.9','1.0']);eng2('NAC °C','',365,E.map(e=>String(Math.round(80+e.egt*0.12))));
    T('F.USED IN T',300,430,'gr',16,'center')}
  else if(pg==='wheel'){const dn=on?FL.gear:true;[[150,190],[300,140],[450,190]].forEach(([x,y],k)=>{if(dn){[-24,24].forEach(o=>{g.strokeStyle=EC_C.g;g.lineWidth=3;g.beginPath();g.moveTo(x+o-16,y-20);g.lineTo(x+o+16,y-20);g.lineTo(x+o,y);g.closePath();g.stroke()})}});
    T(dn?'':'L/G UP',300,170,'w',20,'center');T('BRAKES',300,270,'w',20,'center');T('°C',300,300,'b',18,'center');
    const bt=on&&FL.stage!=='AIR'?(FL.stage==='STOP'||FL.stage==='ROLLOUT'?['185','190','205','195']:['65','70','70','65']):['65','70','70','65'];
    [[110,'1'],[190,'2'],[410,'3'],[490,'4']].forEach(([x,n],k)=>{T(n,x,330,'w',20,'center');T(bt[k],x,360,'g',26,'center')});
    T('AUTO BRK',300,430,'w',20,'center');T(on&&S.phase==='APPR'?'MED':on?'':'MAX',300,458,'g',22,'center');T('NORM BRK',300,500,'g',18,'center')}
  else if(pg==='fuel'){const kg=fobKg()||0,t=tanks(kg),r=x=>String(Math.round(x/10)*10);
    T('F.USED',300,70,'w',20,'center');T('1+2',300,92,'w',18,'center');T(String(Math.round(used/10)*10),300,118,'g',26,'center');T('KG',345,118,'b',18);
    [130,470].forEach((x,i)=>{T(String(i+1),x,80,'w',22,'center');L([[x,100],[x,175]],'g',3)});
    L([[40,230],[560,230],[560,320],[40,320],[40,230]],'w',2);[150,240,360,450].forEach(x=>L([[x,230],[x,320]],'w',2));
    [[95,t.o],[195,t.n],[300,t.c],[405,t.n],[505,t.o]].forEach(([x,v])=>{T(r(v),x+22,280,'g',22,'right')});
    T('LEFT',95,345,'w',16,'center');T('CTR',300,345,'w',16,'center');T('RIGHT',505,345,'w',16,'center');
    T('FOB :',60,420,'w',22);T(r(kg),260,420,'g',28,'right');T('KG',268,420,'b',20)}
  else if(pg==='fctl'){T('G  B',150,80,'g',20,'center');T('G  Y',450,80,'g',20,'center');T('SPD BRK',300,110,'w',20,'center');
    for(let k=0;k<5;k++){const x=180+k*28,x2=420-k*28+(k?0:0);L([[x,140],[x+18,140]],'g',3);L([[600-x-18,140],[600-x,140]],'g',3)}
    T('L AIL',80,200,'w',20,'center');T('R AIL',520,200,'w',20,'center');[80,520].forEach(x=>{L([[x,225],[x,320]],'w',2);L([[x-10,272],[x+10,272]],'g',4)});
    T('PITCH TRIM',300,250,'w',20,'center');T((S.perf.ths||'UP0.0').replace('UP','').replace('DN','-')+'°',300,280,'g',24,'center');T(String(S.perf.ths||'').startsWith('DN')?'DN':'UP',345,280,'g',18);
    T('L ELEV',150,380,'w',20,'center');T('R ELEV',450,380,'w',20,'center');[150,450].forEach(x=>{L([[x,400],[x,490]],'w',2);L([[x-10,445],[x+10,445]],'g',4)});
    T('RUD',300,420,'w',20,'center');g.strokeStyle=EC_C.w;g.lineWidth=2;g.beginPath();g.arc(300,430,70,0.6,Math.PI-0.6);g.stroke();L([[300,470],[300,500]],'g',4)}
  else if(pg==='door'){}
  else if(pg==='hyd'){[['GREEN',120],['BLUE',300],['YELLOW',480]].forEach(([n,x])=>{T(n,x,80,'w',22,'center');T('3000',x,115,'g',26,'center');L([[x,135],[x,330]],'g',3);
      g.strokeStyle=EC_C.g;g.lineWidth=2.5;g.strokeRect(x-26,330,52,40);T(n==='BLUE'?'ELEC':'ENG '+(n==='GREEN'?1:2),x,395,'w',18,'center');T(n==='BLUE'?'':'PUMP',x,350,'g',16,'center')});
    T('PTU',210,200,'g',18,'center');L([[150,210],[270,210]],'g',2)}
  else if(pg==='elec'){T('BAT 1',120,80,'w',20,'center');T('BAT 2',480,80,'w',20,'center');['28 V','28 V'].forEach((v,i)=>T(v,i?480:120,108,'g',22,'center'));['0 A','0 A'].forEach((v,i)=>T(v,i?480:120,134,'g',22,'center'));
    T('DC 1',140,190,'g',20,'center');T('DC BAT',300,190,'g',20,'center');T('DC 2',460,190,'g',20,'center');T('AC 1',140,260,'g',20,'center');T('ESS',300,260,'g',20,'center');T('AC 2',460,260,'g',20,'center');
    const gen=on||!S.elec||!S.elec.ext;[['GEN 1',120],['GEN 2',480]].forEach(([n,x])=>{R(x-62,330,124,120,'w',2);T(n,x,350,'w',20,'center');T(gen?'34 %':'',x,380,'g',22,'center');T(gen?'116 V':'',x,405,'g',22,'center');T(gen?'400 HZ':'',x,430,'g',22,'center')});
    T(S.elec&&S.elec.ext&&!on?'EXT PWR':'',300,390,'g',20,'center')}
  else if(pg==='bleed'){[['1',150],['2',450]].forEach(([n,x])=>{T(n,x,480,'w',22,'center');L([[x,460],[x,250]],'g',3);T('IP',x-30,420,'w',16,'center');T('HP',x+30,420,'w',16,'center');T(String(on?40:28),x+50,330,'g',22,'right');T('PSI',x+56,330,'b',16);T('180',x+50,360,'g',22,'right');T('°C',x+56,360,'b',16)});
    T('X BLEED',300,250,'w',18,'center');T('PACK 1',150,140,'w',18,'center');T('PACK 2',450,140,'w',18,'center');T('RAM AIR',300,90,'w',18,'center');L([[150,160],[150,250]],'g',3);L([[450,160],[450,250]],'g',3)}
  else if(pg==='press'){T('ΔP',100,110,'w',22,'center');T(cab.dp.toFixed(1),100,145,'g',28,'center');T('PSI',100,172,'b',18,'center');
    T('V/S',300,110,'w',22,'center');T(String(cab.vs),300,145,'g',28,'center');T('FT/MIN',300,172,'b',18,'center');
    T('CAB ALT',500,110,'w',22,'center');T(String(cab.alt),500,145,'g',28,'center');T('FT',500,172,'b',18,'center');
    T('LDG ELEV',300,240,'w',20,'right');T('AUTO',320,240,'g',20);T(String(Math.round(cab.ldg/50)*50),500,240,'g',24,'right');T('FT',508,240,'b',18);
    T('SYS 1',450,300,'g',20);T('SAFETY',150,420,'w',18,'center');T('VENT',300,420,'w',18,'center');T('OUTFLOW',460,420,'w',18,'center')}
  else if(pg==='cond'){T('TEMP :',60,70,'w',20);T('°C',150,70,'b',18);[['CKPT',120],['FWD',300],['AFT',480]].forEach(([n,x])=>{T(n,x,140,'w',22,'center');T('22',x,175,'g',26,'center');T('24',x,210,'b',22,'center')});
    T('HOT AIR',300,330,'w',18,'center');L([[60,300],[540,300]],'g',3)}
  else if(pg==='apu'){T('APU',300,80,'w',22,'center');T('AVAIL',300,110,S.elec&&S.elec.apu&&!on?'g':'#000',22,'center');T('N',150,250,'w',22,'center');T('%',150,276,'b',18,'center');T(S.elec&&S.elec.apu&&!on?'100':'0',150,320,'g',28,'center');
    T('EGT',450,250,'w',22,'center');T('°C',450,276,'b',18,'center');T(S.elec&&S.elec.apu&&!on?'345':String(Math.round(satC())),450,320,'g',28,'center');T('FLAP',300,420,'w',18,'center');T('CLOSED',300,446,'g',20,'center')}
  else if(pg==='sts'){T('NORMAL',300,250,'g',30,'center')}
  g.restore();
  /* permanent data */
  {const{T,L}=P;L([[77,497],[598,497]],'w',2);L([[250,497],[250,560]],'w',2);L([[425,497],[425,560]],'w',2);
  const sat=satC(),m=on?FL.mach:0,tat=(sat+273.15)*(1+0.2*m*m)-273.15,sg=v=>(v>=0?'+':'')+Math.round(v);
  T('TAT',110,510,'w',17);T(sg(tat),192,510,'g',17,'right');T('°C',210,512,'b',14);T('SAT',110,530,'w',17);T(sg(sat),192,530,'g',17,'right');T('°C',210,532,'b',14);
  const ut=new Date(on?FL.utc0+FL.t*1000:Date.now());T(String(ut.getUTCHours()).padStart(2,'0'),326,529,'g',17,'right');T('H',336,530,'b',14,'center');T(String(ut.getUTCMinutes()).padStart(2,'0'),345,529,'g',17);
  const gw=S.fuel.zfw!=null&&(on||S.fuel.block!=null)?Math.round((S.fuel.zfw+(on?FL.fob:S.fuel.block-(S.fuel.taxi??0.2)))*1000/100)*100:null;
  T('GW',441,509,'w',17);T(gw!=null?String(gw):'XX',547,509,gw!=null?'g':'a',17,'right');T('KG',566,510,'b',14)}}
/* ---------- ECAM control panel (photo 676 x 248) over the lower half of the ND; MCDU / ECAM switch ---------- */
const ECP_PH=[['tocfg',254,43],['emer',480,50,60,48],['eng',186,113],['bleed',254,113],['press',319,113],['elec',386,113],['hyd',454,113],['fuel',519,113],
  ['apu',186,157],['cond',254,157],['door',319,157],['wheel',386,157],['fctl',454,157],['all',519,157],['clr',186,202],['sts',319,202],['rcl',386,202],['clr2',519,202]];
const IMG_EWD='img/ecam-ewd.webp',IMG_SD='img/ecam-sd.webp',IMG_ECP='img/ecam-ecp.webp';
function ecamUI(){const pan=$('#ecp');if(pan){pan.hidden=!EC.ecp;pan.querySelectorAll('[data-ecp]').forEach(b=>{const k=b.dataset.ecp;b.classList.toggle('lit',EC.page===k)})}
  const nb=$('#ecpBtn');if(nb)nb.setAttribute('aria-pressed',String(!!EC.ecp))}
function ecpPress(k){
  if(k==='clr'||k==='clr2'||k==='rcl'){EC.page=null}
  else if(k==='emer'){}
  else if(k==='tocfg'){if(!flying()&&S.perf.flaps){EC.toCfg=true}}
  else if(k==='all'){EC.page=SD_ORDER[EC.allIx%SD_ORDER.length];EC.allIx++}
  else EC.page=EC.page===k?null:k;
  drawEcam()}
function ecamShow(on){EC.on=on;EC.ecp=on;const h=$('#mcduHome');if(h)h.classList.toggle('ecam-on',on);const b=$('#duToggle');if(b){b.textContent=on?'MCDU':'ECAM';b.setAttribute('aria-pressed',String(on))}drawEcam();ecamUI()}
function drawEcam(){if(EC.on){const a=$('#ewd'),b=$('#sd');if(a&&a.width)drawEWD(a);if(b&&b.width)drawSD(b)}else engStep();ecamUI()}
function buildEcam(){const home=$('#mcduHome');if(!home||$('#ecam'))return;const pc=(v,t)=>(v/t*100).toFixed(3)+'%';
  home.insertAdjacentHTML('afterbegin',`<button type="button" class="dutoggle" id="duToggle" aria-pressed="false" title="Switch between MCDU and ECAM">ECAM</button>
   <div class="ecam" id="ecam" aria-label="ECAM upper and lower displays">
     <div class="ecdu ewd"><img alt="" src="${IMG_EWD}"><canvas id="ewd" aria-label="Engine and warning display"></canvas></div>
     <div class="ecdu sdu"><img alt="" src="${IMG_SD}"><canvas id="sd" aria-label="System display"></canvas><svg id="sdsvg" viewBox="0 0 600 569" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg></div>
   </div>`);
  const nd=$('#ndBezel')&&$('#ndBezel').parentElement;
  if(nd){nd.insertAdjacentHTML('beforeend',`<div class="ecp-pan" id="ecp" hidden aria-label="ECAM control panel"><img alt="" src="${IMG_ECP}">${ECP_PH.map(([k,x,y,w,h])=>{w=w||46;h=h||32;
      return`<button type="button" class="ecp-k" data-ecp="${k}" aria-label="${k.toUpperCase()}" style="left:${pc(x-w/2,676)};top:${pc(y-h/2,248)};width:${pc(w,676)};height:${pc(h,248)}"><i></i></button>`}).join('')}</div>
     <button type="button" class="ecp-btn" id="ecpBtn" aria-pressed="false" title="ECAM control panel on/off">ECP</button>`);
    $('#ecpBtn').addEventListener('click',()=>{EC.ecp=!EC.ecp;ecamUI()})}
  $('#duToggle').addEventListener('click',()=>ecamShow(!EC.on));
  document.querySelectorAll('[data-ecp]').forEach(b=>b.addEventListener('click',()=>ecpPress(b.dataset.ecp)));
  ['#ewd','#sd'].forEach(id=>{const c=$(id);new ResizeObserver(()=>{const d=devicePixelRatio||1,w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);if(w&&(w!==c.width||h!==c.height)){c.width=w;c.height=h;drawEcam()}}).observe(c)})}
buildEcam();
window.drawEcam=drawEcam;window.__EC=EC;window.__ecam={show:ecamShow,press:ecpPress,page:sdPage};
