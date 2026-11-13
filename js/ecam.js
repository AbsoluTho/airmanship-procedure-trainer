'use strict';
/* ================= ECAM: upper display (E/WD) and lower display (SD) =================
   Shown in the MCDU slot, behind the MCDU (MCDU / ECAM switch). Values come from the
   simplified flight model (engines, fuel, configuration, flight phase); systems that are not
   simulated are shown in their normal state. Layouts follow the A320 ECAM in a simplified
   form, for procedure training only. */
const EC={on:false,page:null,manual:false,toCfg:false,toCfgT:-99,stsT:-99,eng:[null,null],t:null,allIx:0};
const ECP_KEYS=[['ENG','eng'],['BLEED','bleed'],['PRESS','press'],['ELEC','elec'],['HYD','hyd'],['FUEL','fuel'],['APU','apu'],['COND','cond'],
  ['DOOR','door'],['WHEEL','wheel'],['F/CTL','fctl'],['ALL','all'],['STS','sts'],['RCL','rcl'],['CLR','clr'],['T.O<br>CONFIG','tocfg'],['MCDU','mcdu']];
const SD_ORDER=['eng','bleed','press','elec','hyd','fuel','apu','cond','door','wheel','fctl'];
const SD_TITLE={eng:'ENGINE',bleed:'BLEED',press:'CAB PRESS',elec:'ELEC',hyd:'HYD',fuel:'FUEL',apu:'APU',cond:'COND',door:'DOOR/OXY',wheel:'WHEEL',fctl:'F/CTL',sts:'STATUS',crz:'CRUISE'};
const EC_C={w:'#ffffff',g:'#3df24e',b:'#3fd2ff',a:'#ff9a1f',m:'#ff8cf0',r:'#ff2020',gr:'#8a8b9f',bg:'#000'};

/* ---------- engine model (N1, N2, EGT, FF) from the thrust and vertical modes ---------- */
function engTarget(){const on=flying(),alt=on?FL.alt:elevO(),q=S.perf,flx=q.flex!=null;
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
  return EC.eng.map((e,i)=>({n1:e.n1+(i?0.2:0),n2:e.n2+(i?0.3:0),egt:e.egt+(i?6:0),ff:e.ff+(i?10:0)}))}

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

/* ---------- drawing helpers (virtual 600 x 600 screen) ---------- */
function ecCtx(c){const g=c.getContext('2d'),W=c.width,H=c.height,s=Math.min(W,H)/600;g.setTransform(1,0,0,1,0,0);g.fillStyle='#000';g.fillRect(0,0,W,H);
  g.setTransform(s,0,0,s,(W-600*s)/2,(H-600*s)/2);g.lineCap='round';g.lineJoin='round';
  const T=(t,x,y,col,px,al,w)=>{g.font=`${w||500} ${Math.round((px||22)*1.12)}px "Helvetica Neue",Helvetica,Arial,sans-serif`;g.fillStyle=EC_C[col]||col;g.textAlign=al||'left';g.textBaseline='middle';g.fillText(t,x,y)};
  const L=(pts,col,w)=>{g.strokeStyle=EC_C[col]||col;g.lineWidth=w||2.5;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke()};
  const R=(x,y,w,h,col,lw)=>{g.strokeStyle=EC_C[col]||col;g.lineWidth=lw||2;g.strokeRect(x,y,w,h)};
  const title=(t,x,y)=>{T(t,x,y,'w',26);g.font='500 29px "Helvetica Neue",Helvetica,Arial,sans-serif';const w=g.measureText(t).width;L([[x,y+15],[x+w,y+15]],'w',2)};
  return{g,T,L,R,title}}
/* dotted memo line: left text, dots, right text */
function memo(T,g,x,y,a,b,done){if(done){T(a+' '+b,x,y,'g',22);return}T(a,x,y,'b',22);g.font='500 25px "Helvetica Neue",Helvetica,Arial,sans-serif';
  const w=g.measureText(a).width,bw=g.measureText(b).width,end=x+255;T('.'.repeat(Math.max(2,Math.floor((end-bw-x-w-6)/7))),x+w+3,y,'b',22);T(b,end,y,'b',22,'right')}

/* ---------- E/WD ---------- */
function gauge(D,cx,cy,r,v,min,max,amb,red,txt){const{g,T,L}=D,a0=200,a1=-20,ang=x=>(a0-(Math.max(min,Math.min(max,x))-min)/(max-min)*(a0-a1))*Math.PI/180;
  g.strokeStyle=EC_C.w;g.lineWidth=3;g.beginPath();g.arc(cx,cy,r,-ang(min),-ang(red??max));g.stroke();
  if(red!=null){g.strokeStyle=EC_C.r;g.lineWidth=5;g.beginPath();g.arc(cx,cy,r,-ang(red),-ang(max));g.stroke()}
  if(amb!=null){const a=ang(amb);L([[cx+Math.cos(a)*(r-8),cy-Math.sin(a)*(r-8)],[cx+Math.cos(a)*(r+6),cy-Math.sin(a)*(r+6)]],'a',4)}
  const a=ang(v);L([[cx+Math.cos(a)*r*0.25,cy-Math.sin(a)*r*0.25],[cx+Math.cos(a)*(r+4),cy-Math.sin(a)*(r+4)]],'g',4);
  g.fillStyle='#000';g.fillRect(cx+2,cy+r*0.05,r*0.98,r*0.5);D.R(cx+2,cy+r*0.05,r*0.98,r*0.5,'gr',1.5);T(txt,cx+r*0.94,cy+r*0.31,'g',r>55?30:26,'right')}
function drawEWD(c){const D=ecCtx(c),{g,T,L}=D,E=engStep(),q=S.perf,on=flying();
  /* N1 */
  [115,335].forEach((cx,i)=>{const n=E[i].n1;gauge(D,cx,100,72,n,0,110,null,100,(Math.floor(n*10)/10).toFixed(1));
    [[0,'0'],[50,'5'],[100,'10']].forEach(([v,l])=>{const a=(200-v/110*220)*Math.PI/180;T(l,cx+Math.cos(a)*56,100-Math.sin(a)*56,'w',16,'center')})});
  T('N1',225,84,'w',22,'center');T('%',225,110,'b',20,'center');
  /* EGT */
  [115,335].forEach((cx,i)=>gauge(D,cx,232,50,E[i].egt,0,1100,1060,1080,String(Math.round(E[i].egt/5)*5)));
  T('EGT',225,222,'w',22,'center');T('°C',225,248,'b',20,'center');
  /* N2, FF */
  const dig=(v,d)=>v.toFixed(d);
  [115,335].forEach((cx,i)=>{T(dig(E[i].n2,1),cx+48,310,'g',28,'right');T(String(Math.round(E[i].ff/20)*20),cx+48,352,'g',28,'right')});
  T('N2',225,300,'w',22,'center');T('%',225,322,'b',18,'center');T('FF',225,344,'w',22,'center');T('KG/H',225,366,'b',16,'center');
  /* thrust limit */
  const flx=q.flex!=null,tl=!on||FL.thr==='TO'?(flx?'FLX':'TOGA'):FL.thr==='LVR'||FL.thr==='CL'?'CLB':'CLB',n1l=tl==='FLX'?Math.max(80,92.4-(q.flex-30)*0.26):tl==='TOGA'?92.8:Math.min(91.5,87.4+(on?FL.alt:0)/1e4*1.2);
  T(tl,450,40,'b',26,'left');T(n1l.toFixed(1),560,78,'g',28,'right');T('%',592,78,'b',20,'right');if(tl==='FLX')T('+'+q.flex+'°C',590,114,'b',22,'right');
  /* FOB */
  const fob=fobKg();T('FOB :',14,398,'w',22);T(fob!=null&&!isNaN(fob)?String(Math.round(fob/10)*10):'XX',200,398,fob!=null&&!isNaN(fob)?'g':'a',28,'right');T('KG',208,398,'b',20);
  /* slats and flaps */
  const cf=on?FL.conf:(q.flaps===1?'1+F':String(q.flaps||0)),si={'0':0,'1':1,'1+F':1,'2':2,'3':2,'FULL':3}[cf]??0,fi={'0':0,'1':0,'1+F':1,'2':2,'3':3,'FULL':4}[cf]??0;
  T('S',432,250,'w',22,'center');T('F',588,250,'w',22,'center');
  g.fillStyle='#3a3d4e';g.beginPath();g.moveTo(482,242);g.lineTo(532,242);g.lineTo(537,254);g.lineTo(477,254);g.closePath();g.fill();
  for(let k=1;k<=3;k++){g.fillStyle=EC_C.w;g.beginPath();g.arc(477-k*13,254+k*8,3,0,7);g.fill()}
  for(let k=1;k<=4;k++){g.fillStyle=EC_C.w;g.beginPath();g.arc(537+k*11,254+k*8,3,0,7);g.fill()}
  L([[477,254],[477-si*13,254+si*8]],'g',5);L([[537,254],[537+fi*11,254+fi*8]],'g',5);
  if(cf!=='0')T(cf==='FULL'?'FULL':cf,510,300,'g',26,'center');
  /* memo area */
  L([[10,425],[590,425]],'w',2);L([[350,435],[350,592]],'w',2);
  const agl=on?FL.alt-groundElev():0,y0=450,dy=26.5,mx=78;
  if(!on){[['T.O AUTO BRK','MAX',true],['SIGNS','ON',true],['CABIN','CHECK',true],['SPLRS','ARM',true],['FLAPS','T.O',!!q.flaps],['T.O CONFIG','TEST',EC.toCfg]].forEach(([a,b,d],k)=>{
      if(k===0)T('T.O',14,y0,'w',22);const a2=k===0?'AUTO BRK':a;
      if(k===5&&d)T('T.O CONFIG NORMAL',mx,y0+k*dy,'g',22);else memo(T,g,mx,y0+k*dy,a2,d&&b==='CHECK'?'READY':b,d)})}
  else if(['APPR'].includes(S.phase)&&agl<2000&&!FL.ground){
    const full=!S.p2.conf3;[['LDG','LDG GEAR','DN',FL.gear],['','SIGNS','ON',true],['','CABIN','READY',true],['','SPLRS','ARM',true],['','FLAPS',full?'FULL':'CONF 3',FL.conf===(full?'FULL':'3')]].forEach(([p,a,b,d],k)=>{
      if(p)T(p,14,y0,'w',22);memo(T,g,mx,y0+k*dy,a,b,d)})}
  /* right memos */
  const rm=[];if(on&&(FL.thr==='TO'||(!FL.ground&&agl<1500&&S.phase==='TAKEOFF')))rm.push(['T.O INHIBIT','m']);
  if(on&&!FL.ground&&S.phase==='APPR'&&agl<800||FL.stage==='ROLLOUT')rm.push(['LDG INHIBIT','m']);
  if(on&&FL.stage==='ROLLOUT')rm.push(['GND SPLRS','g']);
  if(flying()&&FCU.athr===false&&!FL.ground&&FL.stage==='AIR')rm.push(['A/THR OFF','a']);
  rm.forEach(([t,c],k)=>T(t,370,y0+k*dy,c,22))}

/* ---------- SD ---------- */
function drawSD(c){const D=ecCtx(c),{g,T,L,R,title}=D,pg=sdPage(),on=flying(),E=EC.eng[0]?EC.eng:engStep();
  title(SD_TITLE[pg],18,28);
  const used=Math.max(0,((S.fuel.block??0)-(S.fuel.taxi??0.2)-(on?FL.fob:(S.fuel.block??0)-(S.fuel.taxi??0.2)))*1000)+(on?0:0);
  const fu=[Math.round(used/2/10)*10,Math.round(used/2/10)*10+(used>0?10:0)];
  const eng2=(lbl,unit,y,v,col)=>{T(lbl,300,y,'w',21,'center');if(unit)T(unit,300,y+22,'b',18,'center');v.forEach((x,i)=>T(x,i?440:160,y+(unit?11:0),col||'g',26,'center'))};
  const cab=cabin();
  if(pg==='crz'){T('ENG',40,75,'w',22);eng2('F.USED','KG',100,fu.map(String));eng2('OIL','QT',160,['14.5','14.0']);
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
  else if(pg==='door'){g.strokeStyle=EC_C.w;g.lineWidth=2;g.beginPath();g.moveTo(300,60);g.quadraticCurveTo(340,80,340,140);g.lineTo(340,440);g.quadraticCurveTo(300,520,260,440);g.lineTo(260,140);g.quadraticCurveTo(260,80,300,60);g.stroke();
    [[248,130,'CABIN'],[248,420,'CABIN'],[352,130,'CABIN'],[352,420,'CABIN'],[352,220,'CARGO'],[352,360,'CARGO']].forEach(([x,y,l])=>{g.fillStyle=EC_C.g;g.fillRect(x-6,y-12,12,24);T(l,x<300?x-14:x+14,y,'gr',16,x<300?'right':'left')});
    T('OXY',470,80,'w',20,'center');T('1850',470,108,'g',24,'center');T('PSI',515,108,'b',16);T('SLIDE',100,300,'w',16,'center')}
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
  /* permanent data */
  L([[10,520],[590,520]],'w',2);L([[200,520],[200,595]],'w',2);L([[400,520],[400,595]],'w',2);
  const sat=satC(),m=on?FL.mach:0,tat=(sat+273.15)*(1+0.2*m*m)-273.15,sg=v=>(v>=0?'+':'')+Math.round(v);
  T('TAT',18,545,'w',20);T(sg(tat),130,545,'g',24,'right');T('°C',138,545,'b',18);T('SAT',18,578,'w',20);T(sg(sat),130,578,'g',24,'right');T('°C',138,578,'b',18);
  const ut=new Date(on?FL.utc0+FL.t*1000:Date.now());T(String(ut.getUTCHours()).padStart(2,'0'),268,560,'g',28,'right');T('H',284,560,'b',20,'center');T(String(ut.getUTCMinutes()).padStart(2,'0'),300,560,'g',24);
  const gw=S.fuel.zfw!=null&&(on||S.fuel.block!=null)?Math.round((S.fuel.zfw+(on?FL.fob:S.fuel.block-(S.fuel.taxi??0.2)))*1000/100)*100:null;
  T('GW',408,560,'w',20);T(gw!=null?String(gw):'XX',548,560,gw!=null?'g':'a',26,'right');T('KG',554,560,'b',18)}

/* ---------- ECAM control panel, MCDU / ECAM switch ---------- */
function ecamUI(){const host=$('#ecam');if(!host)return;const pg=sdPage();
  host.querySelectorAll('[data-ecp]').forEach(b=>{const k=b.dataset.ecp;b.classList.toggle('lit',(EC.page===k)||(k==='tocfg'&&EC.toCfg&&!flying()))})}
function ecpPress(k){
  if(k==='mcdu'){ecamShow(false);return}
  if(k==='clr'){EC.page=null}
  else if(k==='rcl'){EC.page=null}
  else if(k==='tocfg'){if(!flying()&&S.perf.flaps){EC.toCfg=true}}
  else if(k==='all'){EC.page=SD_ORDER[EC.allIx%SD_ORDER.length];EC.allIx++}
  else if(k==='sts'){EC.page=EC.page==='sts'?null:'sts'}
  else EC.page=EC.page===k?null:k;
  drawEcam()}
function ecamShow(on){EC.on=on;const h=$('#mcduHome');if(h)h.classList.toggle('ecam-on',on);const b=$('#duToggle');if(b){b.textContent=on?'MCDU':'ECAM';b.setAttribute('aria-pressed',String(on))}drawEcam()}
function drawEcam(){if(!EC.on){engStep();return}const a=$('#ewd'),b=$('#sd');if(a&&a.width)drawEWD(a);if(b&&b.width)drawSD(b);ecamUI()}
function buildEcam(){const home=$('#mcduHome');if(!home||$('#ecam'))return;
  const keys=ECP_KEYS.map(([l,k])=>`<button type="button" class="ecp" data-ecp="${k}"><i></i><span>${l}</span></button>`);
  const half=Math.ceil(keys.length/2);
  home.insertAdjacentHTML('afterbegin',`<button type="button" class="dutoggle" id="duToggle" aria-pressed="false" title="Switch between MCDU and ECAM">ECAM</button>
   <div class="ecam" id="ecam" aria-label="ECAM upper and lower displays">
     <div class="ecp-col">${keys.slice(0,half).join('')}</div>
     <div class="ecam-dus">
       <div class="du"><canvas id="ewd" aria-label="Engine and warning display"></canvas></div>
       <div class="du"><canvas id="sd" aria-label="System display"></canvas></div>
     </div>
     <div class="ecp-col">${keys.slice(half).join('')}</div>
   </div>`);
  $('#duToggle').addEventListener('click',()=>ecamShow(!EC.on));
  home.querySelectorAll('[data-ecp]').forEach(b=>b.addEventListener('click',()=>ecpPress(b.dataset.ecp)));
  ['#ewd','#sd'].forEach(id=>{const c=$(id);new ResizeObserver(()=>{const d=devicePixelRatio||1,w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);if(w&&(w!==c.width||h!==c.height)){c.width=w;c.height=h;drawEcam()}}).observe(c)})}
buildEcam();
window.drawEcam=drawEcam;window.__EC=EC;window.__ecam={show:ecamShow,press:ecpPress,page:sdPage};
