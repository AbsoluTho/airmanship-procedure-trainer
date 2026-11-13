'use strict';
/* ================= SD system pages ported from FlyByWire A32NX (GPL-3.0) =================
   ENGINE, CRUISE, WHEEL, FUEL, DOOR/OXY, BLEED, CAB PRESS, ELEC, HYD, APU, COND (SD, 600 or 768 unit pages)
   and F/CTL, STATUS (SDv2, 768 units):
   the same coordinates, shapes, classes and text sizes as the FlyByWire SVG pages, rendered as SVG
   over the lower ECAM screen. Values come from the trainer's simplified model; systems that are
   not simulated are shown in their normal state. */
const SDP_PORTED=['eng','crz','wheel','fuel','door','fctl','bleed','press','elec','hyd','apu','cond','sts'];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const tx=(x,y,s,cls,ex)=>`<text x="${x}" y="${y}" class="${cls||''}"${ex?' '+ex:''}>${esc(s)}</text>`;
const pth=(d,cls,ex)=>`<path d="${d}" class="${cls||''}"${ex?' '+ex:''}/>`;
const ln=(x1,y1,x2,y2,cls)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls||''}"/>`;
const grp=(x,y,inner,cls)=>`<g transform="translate(${x},${y})"${cls?` class="${cls}"`:''}>${inner}</g>`;
const svg768=inner=>`<svg viewBox="0 0 768 768" width="600" height="600" overflow="visible">${inner}</svg>`;
/* gauges (FlyByWire @instruments/common/gauges) */
const gRot=(v,min,max)=>-90+((Math.min(max,v)-min)/(max-min))*180;
function polar(cx,cy,r,a){const t=(a-90)*Math.PI/180;return[cx+r*Math.cos(t),cy+r*Math.sin(t)]}
function arcD(x,y,r,a0,a1){const s=polar(x,y,r,a1),e=polar(x,y,r,a0),size=a0>a1?360-a1+a0:a1-a0;return`M ${s[0]} ${s[1]} A ${r} ${r} 0 ${size<=180?0:1} 0 ${e[0]} ${e[1]}`}
const arc=(x,y,r,to,max,cls)=>pth(arcD(x,y,r,-90,gRot(to,0,max)),cls,'stroke-width="2.5"');
const needle=(x,y,len,v,max,cls,off)=>pth(`M ${x} ${y} v -${len}`,cls,`stroke-width="2" transform="rotate(${gRot(v,0,max)} ${x} ${y})" stroke-dasharray="${len}" stroke-dashoffset="${off}"`);
const tri=(x,y,col,fill,orient)=>`<polygon class="${col}Line${fill?' Fill'+col:''}" points="${x+9},${y+18} ${x},${y} ${x-9},${y+18}" transform="rotate(${orient} ${x} ${y})"/>`;
const split1=v=>{const s=(Math.round(v*10)/10).toFixed(1).split('.');return s};

/* ---------- shared figures from the model ---------- */
function sdData(){const on=flying(),E=EC.eng[0]?EC.eng:engStep(),blk=S.fuel.block,tx_=S.fuel.taxi??0.2;
  const used=Math.max(0,blk!=null&&on?(blk-tx_-FL.fob)*1000:0),fu=[Math.round(used/2/10)*10,Math.round(used/2/10)*10+(used>0?10:0)];
  const air=on&&!FL.ground,gear=on?FL.gear:true,agl=on?FL.alt-groundElev():0;
  return{on,E,fu,used,air,gear,agl,cab:cabin(),kg:fobKg()||0,run:true}}

/* ---------- ENGINE (SD/Pages/Eng, 600 units) ---------- */
function pgEng(D){const col=(i)=>{const x=i?420:180,e=D.E[i],y=80;
    const oilQ=i?14.0:14.5,psi=Math.round(Math.max(20,(e.n2-55)*1.9+28)),otmp=Math.round(70+e.n2*0.35),qx=x,qy=y+85,px=x,py=y+110;
    const q=split1(oilQ),v1=split1(i?0.9:0.8),v2=split1(i?1.2:1.1);
    return tx(x,y,String(D.fu[i]),'FillGreen FontLarge TextCenter')+
      /* oil quantity */
      ln(qx-51,qy,qx-45,qy,'GaugeMarking')+ln(qx,qy-50,qx,qy-45,'GaugeMarking')+ln(qx+45,qy,qx+51,qy,'GaugeMarking')+arc(qx,qy,50,100,100,'WhiteLine NoFill')+
      needle(qx,qy,60,oilQ/24.25*100,100,'NoFill GreenLine',-40)+needle(qx,qy,60,1.35/24.25*100-3,100,'NoFill AmberHeavy',-50)+needle(qx,qy,50,1.35/24.25*100-2,100,'NoFill AmberLine',-45)+
      `<text x="${qx+5}" y="${qy}" class="FontLarge TextCenter FillGreen"><tspan class="FontLarge">${q[0]}</tspan><tspan class="FontSmall">.</tspan><tspan class="FontSmall">${q[1]}</tspan></text>`+
      /* oil pressure */
      ln(px,py,px,py+5,'GaugeMarking')+ln(px+45,py+50,px+51,py+50,'GaugeMarking')+arc(px,py+50,50,100,100,'WhiteLine NoFill')+arc(px,py+50,50,12,100,'RedLine NoFill')+
      needle(px,py+50,60,Math.min(100,psi/130*100),100,'NoFill GreenLine',-40)+tx(px,py+45,String(psi),'FontLarge TextCenter FillGreen')+
      tx(x,y+220,String(otmp),'FontLarge TextCenter FillGreen')+
      `<text x="${x}" y="${y+270}" class="FillGreen TextCenter"><tspan class="FontLarge">${v1[0]}</tspan><tspan class="FontSmall">.</tspan><tspan class="FontSmall">${v1[1]}</tspan></text>`+
      `<text x="${x}" y="${y+300}" class="FillGreen TextCenter"><tspan class="FontLarge">${v2[0]}</tspan><tspan class="FontSmall">.</tspan><tspan class="FontSmall">${v2[1]}</tspan></text>`};
  return`<g class="p-eng">`+tx(6,18,'ENGINE','PageTitle','dominant-baseline="central"')+col(0)+
    ln(250,75,225,77,'Indicator')+tx(300,75,'F.USED','FillWhite FontMedium TextCenter')+tx(300,97,'KG','FillCyan FontSmall TextCenter')+ln(350,75,375,77,'Indicator')+
    tx(300,135,'OIL','FillWhite FontMedium TextCenter')+tx(300,160,'QT','FillCyan FontSmall TextCenter')+tx(300,235,'PSI','FillCyan FontSmall TextCenter')+
    ln(250,292,225,294,'Indicator')+tx(300,290,'°C','FillCyan FontSmall TextCenter')+ln(350,292,375,294,'Indicator')+
    ln(250,340,225,342,'Indicator')+tx(300,340,'VIB N1','FillWhite FontSmall TextCenter')+ln(350,340,375,342,'Indicator')+
    ln(250,370,225,372,'Indicator')+tx(300,370,'    N2','FillWhite FontSmall TextCenter','xml:space="preserve"')+ln(350,370,375,372,'Indicator')+col(1)+`</g>`}

/* ---------- CRUISE (SD/Pages/Crz, 600 units) ---------- */
function pgCrz(D){const c=D.cab,dp=split1(c.dp),o1=split1(14.5),o2=split1(14.0),v=[split1(0.8),split1(0.9)],vs=Math.round(c.vs/50)*50,ca=Math.max(0,Math.round(c.alt/50)*50);
  const dec=(x,y,a)=>tx(x,y,a[0]+'.','Large Green','text-anchor="end"')+tx(x+(x>300?0:2),y,a[1],'Standard Green','text-anchor="start"');
  const arrow=Math.abs(vs)>=50?`<g${vs<0?' transform="translate(0, 795) scale(1, -1)"':''}>${pth('M433,405 h7 L446,395','VsIndicator','stroke-linejoin="miter"')}<polygon points="452,388 447,396 457,396" transform="rotate(38,452,388)" class="VsIndicator"/></g>`:'';
  return`<g class="p-crz">`+tx(300,20,'CRUISE','Title')+tx(50,60,'ENG','SubTitle')+
    tx(300,70,'F.USED','Standard Center')+tx(300,90,'1+2','Standard Center')+tx(210,95,String(D.fu[0]),'Large Green','text-anchor="end"')+tx(455,95,String(D.fu[1]),'Large Green','text-anchor="end"')+
    tx(300,112,String(D.fu[0]+D.fu[1]),'Large Green Center')+tx(300,132,'KG','Standard Cyan Center')+pth('M230 80 l20 -2','WingPlaneSym')+pth('M370 80 l-20 -2','WingPlaneSym')+
    tx(300,160,'OIL','Standard Center')+tx(300,180,'QT','Medium Cyan Center')+pth('M230 170 l20 -2','WingPlaneSym')+pth('M370 170 l-20 -2','WingPlaneSym')+
    tx(300,220,'VIB N1','Standard Center')+tx(312,250,'N2','Standard')+pth('M230 220 l20 -2','WingPlaneSym')+pth('M370 220 l-20 -2','WingPlaneSym')+pth('M230 250 l20 -2','WingPlaneSym')+pth('M370 250 l-20 -2','WingPlaneSym')+
    dec(195,185,o1)+dec(440,185,o2)+dec(195,235,v[0])+dec(195,265,split1(1.1))+dec(440,235,v[1])+dec(440,265,split1(1.2))+
    tx(50,330,'AIR','SubTitle')+
    tx(330,335,'LDG ELEV','Standard Center')+tx(385,335,'AUTO','Standard Green')+tx(525,335,String(Math.round(c.ldg/50)*50),'Large Green','text-anchor="end"')+tx(530,335,'FT','Standard Cyan')+
    tx(218,370,'ΔP','Standard')+tx(290,370,dp[0]+'.','Large Green','text-anchor="end"')+tx(290,370,dp[1],'Standard Green')+tx(320,370,'PSI','Standard Cyan')+
    tx(480,380,'CAB V/S','Standard')+tx(515,405,String(Math.abs(vs)),'Large Green','text-anchor="end"')+tx(525,405,'FT/MIN','Medium Cyan')+
    tx(480,450,'CAB ALT','Standard')+tx(515,475,String(ca),'Large Green','text-anchor="end"')+tx(525,475,'FT','Medium Cyan')+arrow+
    pth('M 300 410 a 70 70 0 0 0 -30 -5 l -180 0 m 30 0 l 0 50 l 85 0 l 0 -10 m 0 10 l 85 0 l 0 -48 m -170 48 l -30 0 c -60 0 -60 -20 -45 -25','WingPlaneSym')+
    tx(55,425,'CKPT','Standard')+tx(75,448,'22','Standard Green')+tx(145,425,'FWD','Standard')+tx(150,448,'23','Standard Green')+tx(245,425,'AFT','Standard')+tx(235,448,'23','Standard Green')+tx(310,455,'°C','Medium Cyan')+`</g>`}

/* ---------- DOOR/OXY (SD/Pages/Door, 600 units) ---------- */
function pgDoor(){const dr=d=>pth(d,'DoorShape');
  return`<g class="p-door">`+pth('M 267 473 l -5 -13 l 0 -340 C 260,102 276,52 300,40','MainShape')+pth('M 333 473 l 5 -13 l 0 -340 C 340,102 324,52 300,40','MainShape')+
    ln(262,275,160,308,'MainShape')+ln(338,275,440,308,'MainShape')+
    ['M292 73 l0 -9 l16 0 l0 9Z','M283 102 l0 -15 l9 0 l0 15Z','M317 102 l0 -15 l-9 0 l0 15Z','M300 181 l0 10 l16 0 l0 -10Z','M336 221 l0 -20 l-18 0 l0 20Z','M336 384 l0 -20 l-18 0 l0 20Z','M328 414 l0 -22 l-8 0 l0 22Z',
     'M264 145 l0 -20 l12 0 l0 20Z','M336 145 l0 -20 l-12 0 l0 20Z','M264 310 l0 -20 l12 0 l0 20Z','M336 310 l0 -20 l-12 0 l0 20Z','M264 344 l0 -20 l12 0 l0 20Z','M336 344 l0 -20 l-12 0 l0 20Z','M264 445 l0 -20 l12 0 l0 20Z','M336 445 l0 -20 l-12 0 l0 20Z'].map(dr).join('')+
    tx(300,16,'DOOR/OXY','Title','text-anchor="middle" dominant-baseline="central" text-decoration="underline"')+
    tx(232,320,'SLIDE','Slide','text-anchor="middle" dominant-baseline="central"')+tx(368,320,'SLIDE','Slide','text-anchor="middle" dominant-baseline="central"')+
    tx(490,18,'CKPT OXY','Oxygen','text-anchor="middle" dominant-baseline="central"')+tx(432,42,'1700','Value','text-anchor="middle" dominant-baseline="central"')+
    tx(486,43,'PSI','Unit','text-anchor="middle" dominant-baseline="central"')+tx(538,42,'1700','Value','text-anchor="middle" dominant-baseline="central"')+`</g>`}

/* ---------- WHEEL (SD/Pages/Wheel, 768 units) ---------- */
function pgWheel(D){const on=D.on,gear=D.gear,ro=on&&FL.stage==='ROLLOUT',stopped=on&&FL.stage==='STOP';
  const arch=(x,y,type,cls)=>pth(`m${x} ${y} a -62 -62 0 0 ${type==='bottom'?0:1} 60 0`,cls||'ThickGreyLine');
  const spoiler=(x,y,side,out)=>grp(x,y,pth(`M 0 0 l ${side==='right'?'-':''}19 0`,'GreenLine')+(out?pth(`M 0 -31 l ${side==='left'?19:-19} 0 l ${side==='left'?-9.5:9.5} -16 z`,'GreenLine')+pth(`M ${side==='left'?9.5:-9.5} 0 l 0 -31`,'GreenLine'):''));
  const sp=[[0,26,'left'],[50,19,'left'],[99,12,'left'],[147,6,'left'],[197,0,'left'],[304,0,'right'],[354,6,'right'],[402,12,'right'],[452,19,'right'],[501,26,'right']];
  const out=ro&&FL.ias>20;
  const joint=(x,y)=>`<ellipse class="WhiteLine" cx="${x}" cy="${y}" rx="4.5" ry="4.5"/>`;
  const ind=down=>down?`<g class="GreenLine">${pth('m 0 0 h 27 v 37 z')}${pth('m 6 0 v 8')}${pth('m 13 0 v 17')}${pth('m 20 0 v 27')}</g><g class="GreenLine">${pth('m 63 0 h -27 v 37 z')}${pth('m 43 0 v 27')}${pth('m 50 0 v 17')}${pth('m 57 0 v 8')}</g>`:'';
  const sideGear=(x,y,loc)=>grp(x,y,grp(0,0,pth('m0 0 h24','WhiteLine')+pth('m159 0 h24','WhiteLine')+ln(33,0,149,0,'GreenLine')+joint(loc==='left'?154:29,0))+grp(60,9,ind(gear)));
  const noseGear=(x,y)=>grp(x,y,grp(0,0,pth('m 0 0 h 22','WhiteLine')+pth('m 161 0 h 22','WhiteLine')+ln(34,0,78,0,'GreenLine')+ln(106,0,150,0,'GreenLine')+joint(29,0)+joint(155,0))+grp(60,9,ind(gear)));
  const bt=on&&(ro||stopped)?[Math.round(150+Math.min(1,(FL.t-(FL._tdT??FL.t))/60)*60),160,175,165]:[on?45:20,on?50:25,on?50:25,on?45:20];
  const hottest=Math.max(...bt);
  const wheels=(x,y,a,b)=>grp(x,y,arch(0,0,'top',a.t===hottest&&a.t>100?'GreenLine':null)+arch(124,0,'top',b.t===hottest&&b.t>100?'GreenLine':null)+arch(0,103,'bottom')+arch(124,103,'bottom')+
    tx(73,32,'°C','Cyan Standard')+tx(72,66,'REL','Standard')+tx(57,33,String(Math.round(a.t/5)*5),'Green Large End')+tx(181,33,String(Math.round(b.t/5)*5),'Green Large End')+tx(22,66,String(a.n),'Large')+tx(146,66,String(b.n),'Large'));
  const ab=!on?'MAX':(ro||(S.phase==='APPR'))?'MED':null;
  return`<g class="p-wheel ecam-common-styles">`+svg768(tx(15,149,'WHEEL','Title UnderlineWhite')+grp(133,64,sp.map(([x,y,s])=>spoiler(x,y,s,out)).join(''))+
    (ab?grp(318,570,tx(0,0,'AUTO BRK','Large Green')+grp(40,32,tx(0,0,ab,'Large Green'))):'')+
    sideGear(40,272,'left')+wheels(36,431,{n:1,t:bt[0]},{n:2,t:bt[1]})+noseGear(294,137)+arch(294,218,'bottom')+arch(416,218,'bottom')+
    sideGear(550,272,'right')+wheels(551,431,{n:3,t:bt[2]},{n:4,t:bt[3]}))+`</g>`}

/* ---------- FUEL (SD/Pages/Fuel, 600 units) ---------- */
function pgFuel(D){const t=tanks(D.kg),r=v=>String(Math.round(v/10)*10),ff=(D.E[0].ff+D.E[1].ff)/60;
  const lpValve=(x,y)=>`<g class="ThickShape ValveGreen"><circle cx="${x}" cy="${y}" r="15"/>${ln(x,y-15,x,y+15)}</g>`;
  const xfeed=(x,y)=>`<g class="ThickShape ValveGreen"><circle cx="${x}" cy="${y}" r="15"/>${ln(x,y-15,x,y+15)}</g>`;
  const pump=(x,y,on)=>`<g class="ThickShape ${on?'PumpActive':'PumpInactive'}"><rect x="${x}" y="${y}" width="30" height="30"/>${on?ln(x+15,y,x+15,y+30):ln(x+5,y+15,x+25,y+15)}</g>`;
  const ctr=(x,y)=>{const open=t.c>50;return`<g class="ThickShape"><rect x="${x}" y="${y}" width="30" height="30" class="${open?'ValveGreen':'ValveGreen'}"/>${open?ln(x+15,y,x+15,y+30,'GreenLine'):ln(x+5,y+15,x+25,y+15,'GreenLine')}</g>`};
  return`<g class="p-fuel">`+tx(14,16,'FUEL','PageTitle','dominant-baseline="central"')+
    tx(300,28,'F.USED','FuelUsed')+tx(300,50,'1+2','FuelUsed')+tx(301,76,String(D.fu[0]+D.fu[1]),'UsedQuantity')+tx(301,98,'KG','Unit','text-anchor="middle"')+
    ln(200,31,250,21,'EngineLine')+tx(160,41,'1','EngineNumber EngineNumberOn')+tx(160,68,String(D.fu[0]),'UsedQuantity')+
    ln(400,31,350,21,'EngineLine')+tx(440,41,'2','EngineNumber EngineNumberOn')+tx(440,68,String(D.fu[1]),'UsedQuantity')+
    /* wings */
    pth('M 15, 255 l 0, 75 l 570, 0 l 0,-75','ThickShape','stroke-linecap="round"')+pth('M 585, 255 l -124.2, -21.6','ThickShape')+pth('M 15, 255 l 124.2, -21.6','ThickShape')+
    pth('M 245, 215 l 110, 0','ThickShape')+pth('M 245, 215 l -29.9, 5.2','ThickShape')+pth('M 355, 215 l 29.9, 5.2','ThickShape')+
    pth('M 85, 243 L 85, 330','ThickShape')+pth('M 245, 215 L 230, 330','ThickShape')+pth('M 355, 215 L 370, 330','ThickShape')+pth('M 515, 243 L 515, 330','ThickShape')+
    /* APU (off: fuel line not shown) */
    `<g>`+tx(122,150,'APU','White','text-anchor="end" dominant-baseline="central"')+tri(129,150,'White',0,-90)+`</g>`+
    /* left */
    ln(160,84,160,76,'FlowShape')+lpValve(160,100)+ln(160,215,160,116,'FlowShape')+ln(160,190,196,190,'FlowShape')+ln(195,190,195,215,'FlowShape')+pump(145,215,true)+pump(180,215,true)+
    tx(80,285,r(t.o),'TankQuantity')+tx(190,285,r(t.n),'TankQuantity')+tx(70,355,'°C','UnitTemp')+
    /* centre */
    xfeed(300,150)+ctr(267,223)+ctr(302,223)+tx(330,315,r(t.c),'TankQuantity')+
    /* right */
    ln(440,84,440,76,'FlowShape')+lpValve(440,100)+ln(440,215,440,116,'FlowShape')+ln(440,190,404,190,'FlowShape')+ln(405,190,405,215,'FlowShape')+pump(390,215,true)+pump(425,215,true)+
    tx(472,285,r(t.n),'TankQuantity')+tx(580,285,r(t.o),'TankQuantity')+tx(510,355,'°C','UnitTemp')+
    /* F.FLOW, FOB */
    tx(46,443,'F.FLOW','FuelFlowLabel')+tx(46,461,'1+2','FuelFlowLabel')+`<text id="FuelFlowColon" x="83" y="461">:</text>`+
    `<text id="FuelFlowValue" x="201" y="455">${Math.round(ff)}</text><text id="FuelFlowUnit" x="215" y="455">KG/MIN</text>`+
    pth('m 5 499 v -30 h 250 v 30 z','ThickShape')+`<text id="FobLabel" x="18" y="491">FOB</text><text id="FobColon" x="83" y="490">:</text><text id="FobValue" x="204" y="485">${r(D.kg)}</text><text id="FobUnit" x="215" y="487">KG</text>`+`</g>`}

/* ---------- F/CTL (SDv2/Pages/Fctl, 768 units) ---------- */
function pgFctl(D){const on=D.on,air=D.air;
  /* surface positions (deg): ailerons from the roll rate, elevator from the pitch, pitch trim from PERF before flight */
  const ail=on?Math.max(-25,Math.min(25,((FL._rollPrev!=null?FL.roll-FL._rollPrev:0))*8)):0;if(on)FL._rollPrev=FL.roll;
  const elev=on&&air?Math.max(-30,Math.min(15,-(FL.pitch-3)*1.5)):0;
  const ths=on?(air?(FL.alt>20000?1.2:2.4):Number(String(S.perf.ths||'UP0').replace('UP','').replace('DN','-'))):Number(String(S.perf.ths||'UP0.0').replace('UP','').replace('DN','-'));
  const thsWord=-ths;   /* FlyByWire: positive = DN */
  const out=on&&FL.stage==='ROLLOUT'&&FL.ias>20;
  const hyd=(x,y,sys)=>grp(x,y,`<rect x="0" y="0" class="Grey Fill" width="23" height="27" rx="0"/>`+tx(12,22,sys,'F22 Green Center'));
  const comp=(x,y,n)=>grp(x,y,pth('M0 0 l97,0 l0,-33 l-10,0','SW2 Green LineRound')+tx(76,-7,String(n),'F25 Green'));
  const sideSign=s=>s==='left'?'-':'';const oppSign=s=>s==='right'?'-':'';
  const aileron=(x,y,side,defl)=>{const tp=side==='left'?-53:54;
    const d1=`M0 0 l${sideSign(side)}6 0 l0 -25 l${oppSign(side)}6 0 l0 147 l${sideSign(side)}6 0 l0 -10 l${oppSign(side)}6 0`;
    return grp(x,y,tx(tp,0,side==='left'?'L':'R','F28 White Center')+tx(tp,26,'AIL','F25 White Center LS1')+
      grp(0,8,pth(d1,'SW3 White LineJoinRound')+pth(`M0 46 l${sideSign(side)}6 0`,'SW3 White LineRound')+pth(`M0 52 l${sideSign(side)}6 0`,'SW3 White LineRound')+pth(`M0 59 l${sideSign(side)}6 0 l0 6 l${oppSign(side)}6 0`,'SW3 White LineJoinRound'))+
      grp(0,(Math.round(defl*100)/100)*68.5/25,pth(`M0 57 l${side==='right'?'-':''}15 -9 l0 18Z`,'Green SW3 LineJoinRound'))+
      hyd(side==='left'?27:-75,96,side==='left'?'B':'G')+hyd(side==='left'?52:-50,96,side==='left'?'G':'B'))};
  const elevator=(x,y,side,defl)=>{const tp=side==='left'?-59:62;
    const d1=`M0 -13 l${sideSign(side)}6 0 l0 -12 l${oppSign(side)}6 0 l0 148 l${sideSign(side)}6 0 l0 -12 l${oppSign(side)}6 0`;
    return grp(x,y,tx(tp,0,side==='left'?'L':'R','F28 White Center')+tx(tp,27,'ELEV','F25 White Center LS1')+
      grp(0,5,pth(d1,'SW3 White LineJoinRound')+pth(`M0 69 l${sideSign(side)}6 0 l0 6 l${oppSign(side)}6 0`,'SW3 White LineJoinRound'))+
      grp(0,(Math.round(defl*100)/100)*90/30,pth(`M0 77 l${side==='right'?'-':''}15 -9 l0 18Z`,'Green SW3 LineJoinRound'))+
      hyd(side==='left'?-78:28,91,side==='left'?'B':'Y')+hyd(side==='left'?-53:53,91,side==='left'?'G':'B'))};
  const tr=Math.abs(ths).toFixed(1).split('.');
  const pitchTrim=grp(356,350,tx(0,22,'PITCH TRIM','White F25 Center LS1')+grp(-15,96,pth('M0 0 l-72,9 l0,-28 l38,-19','SW2 Grey LineRound')+pth('M85 0 l72,9 l0,-28 l-38,-19','SW2 Grey LineRound'))+
    tx(-1,53,tr[0],'Green F29 End')+tx(4,53,'.','Green F26 Center')+tx(21,53,tr[1],'Green F22 Center')+tx(41,56,'°','Cyan F36 Center')+(Math.abs(ths)>0.05?tx(74,52,thsWord>0?'DN':'UP','Green F22 Center'):'')+
    hyd(102,0,'G')+hyd(128,0,'Y'));
  const rud=0;
  const rudder=grp(384,454,tx(-1,0,'RUD','F25 White Center LS1')+pth('M66 131 A 122 122 0 0 1 -66 131','SW3 White LineRound')+pth('m-3 151 v 6 h 5 v-6','SW3 White LineJoinRound')+
    pth('m-4.5 151 v 6 h 9 v-6','SW3 White LineJoinRound','transform="rotate(25 0 26)"')+pth('m-4.5 151 v 6 h 9 v-6','SW3 White LineJoinRound','transform="rotate(-25 0 26)"')+
    `<g transform="rotate(${(-rud*25)/100} 0 26)">${pth('M -9 93 A 9 9 0 0 1 9 93','Green SW3 LineJoinRound')}${pth('M-9 93 l9 57 l9,-57','Green SW3 LineJoinRound')}</g>`+
    hyd(-38,14,'G')+hyd(-13,14,'B')+hyd(12,14,'Y')+
    `<g transform="rotate(${air&&FL.ias>200?20:25} 0 26)">${pth('m0 151 l 0 21 l 7 0','Green SW2 LineJoinRound')}</g><g transform="rotate(${air&&FL.ias>200?-20:-25} 0 26)">${pth('m0 151 l 0 21 l -7 0','Green SW2 LineJoinRound')}</g>`+
    `<g transform="rotate(0 0 26)">${pth('m0 159 v 11','Cyan SW6 LineRound')}</g>`);
  const spoiler=(x,y,side)=>grp(x,y,pth(`M 0 0 l ${side==='right'?'-':''}19 0`,'Green SW2')+(out?pth(`M 0 -31 l ${side==='left'?19:-19} 0 l ${side==='left'?-9.5:9.5} -16 z`,'Green SW2')+pth(`M ${side==='left'?9.5:-9.5} 0 l 0 -31`,'Green SW2'):''));
  const sp=[[0,26,'left'],[50,19,'left'],[99,12,'left'],[147,6,'left'],[197,0,'left'],[304,0,'right'],[354,6,'right'],[402,12,'right'],[452,19,'right'],[501,26,'right']];
  const wings=grp(124,11,tx(262,124,'SPD BRK','F25 White Center LS1')+hyd(225,0,'G')+hyd(250,0,'B')+hyd(275,0,'Y')+grp(9,89,sp.map(([x,y,s])=>spoiler(x,y,s)).join(''))+
    pth('M0 60 l0 -6 l182 -30 l0 6','Grey SW2')+pth('M49 119 l0 6 l135 -14 l0 -6','Grey SW2')+pth('M519 60 l0 -6 l-182 -30 l0 6','Grey SW2')+pth('M470 119 l0 6 l-135 -14 l0 -6','Grey SW2'));
  return`<g class="p-fctl sdv2">`+svg768(tx(8,33,'F/CTL','F36 White Underline')+tx(221,226,'ELAC','White F22')+comp(215,234,1)+comp(245,252,2)+
    tx(408,226,'SEC','White F22 LS1')+comp(395,234,1)+comp(425,252,2)+comp(455,270,3)+wings+aileron(88,197,'left',ail)+aileron(678,197,'right',-ail)+
    elevator(212,424,'left',elev)+elevator(555,424,'right',elev)+pitchTrim+rudder)+`</g>`}

/* =================== batch 2: BLEED, CAB PRESS, ELEC, HYD, APU, COND (SD, 600 or 768 units), STATUS (SDv2) =================== */
/* FlyByWire gauge parts (@instruments/common/gauges): GaugeComponent arc and GaugeMarkerComponent */
function vrac(v,min,max,sa,ea,perp){const p=(v-min)/(max-min),a0=perp?0:90,deg=sa>ea?sa+p*(360-sa+ea)-a0:sa+p*(ea-sa)-a0,r=deg*Math.PI/180;return{x:Math.cos(r),y:Math.sin(r)}}
function gMark(o){const{value,x,y,min,max,r,sa,ea,cls}=o,mo=o.mo??1.15,mi=o.mi??0.85,d=vrac(value,min,max,sa,ea);
  let s={x:x+d.x*r*mi,y:y+d.y*r*mi},e={x:x+d.x*r,y:y+d.y*r};
  if(o.outer){s={x:x+d.x*r,y:y+d.y*r};e={x:x+d.x*r*mo,y:y+d.y*r*mo}}
  if(o.indicator){if(!o.half)s={x,y};e={x:x+d.x*r*mo,y:y+d.y*r*mo}}
  const f=n=>Math.round(n*100)/100,tv=o.showValue?String(Math.abs(value)):'';
  return`<line x1="${f(s.x)}" y1="${f(s.y)}" x2="${f(e.x)}" y2="${f(e.y)}" class="${cls}"${o.bold?' stroke-width="2"':''} stroke-linecap="${o.round?'round':'square'}"/>`+
    (tv?`<text x="${f(x+d.x*r*mi+(o.nx||0))}" y="${f(y+d.y*r*mi+(o.ny||0))}" class="${o.tcls||'GaugeText'}" dominant-baseline="central" text-anchor="middle">${tv}</text>`:'')}
const gArc=(x,y,r,sa,ea,cls,inner)=>`<g class="GaugeComponent"><g>${pth(arcD(x,y,r,sa,ea),cls)}${inner||''}</g></g>`;
/* SD Common Shapes Triangle (x,y = tip; rotated about the tip) */
const triS=(x,y,col,fill,orient,sc=1)=>`<polygon class="${col}Line${fill?' Fill'+col:''}" points="${x+sc*9},${y+2*sc*9} ${x},${y} ${x-sc*9},${y+2*sc*9}" transform="rotate(${orient} ${x} ${y})"/>`;
/* Bleed/Cond Valve: V open in a vertical duct, H across it, D in transit */
const valveS=(x,y,r,pos,css)=>`<g><circle cx="${x}" cy="${y}" r="${r}" class="${css}"/>${pos==='V'?pth(`M ${x},${y-r} l 0,${2*r}`,css):pos==='H'?pth(`M ${x-r},${y} l ${2*r},0`,css):pth(`M ${x-0.707*r},${y-0.707*r} l ${1.414*r},${1.414*r}`,css)}</g>`;
/* systems state: the trainer simulates the engines, cabin pressure, EXT PWR and APU MASTER SW; the rest is shown normal */
function sdSys(D){const air=D.air,el=S.elec||{},apu=!air&&!!el.apu;
  return{air,gnd:!air,apu,apuBleed:apu,ext:!air&&!!el.ext,bat:[air||!!el.bat1,air||!!el.bat2],n2:D.E.map(e=>e.n2)}}

/* ---------- BLEED (SD/Pages/Bleed, 600 units) ---------- */
function pgBleed(D){const Y=sdSys(D),xOpen=Y.apuBleed,prv=[!Y.apuBleed,!Y.apuBleed],pack=[true,true];
  const gauge=(x,y,e)=>{const pOut=15,cot=Math.round((150+(D.E[e].n2-58)*1.2)/5)*5,byp=50,flow=100;
    return`<g id="Engine${e+1}AirCond">`+tx(x+15,y-117,String(pOut),'Large End Green')+tx(x+20,y-117,'°C','Cyan Standard')+
      gArc(x,y-69,38,-63,63,'GaugeComponent Gauge',gMark({value:50,x,y:y-69,min:0,max:100,r:38,sa:-63,ea:63,cls:'WhiteStroke Stroke2',outer:1,mo:1.1})+
        gMark({value:byp,x,y:y-69,min:0,max:100,r:38,sa:-63,ea:63,cls:'GaugeIndicator Gauge LineCapRound',indicator:1,mo:1.1}))+
      tx(x+15,y-47,String(cot),'Large End Green')+tx(x+20,y-47,'°C','Cyan Standard')+
      gArc(x,y,38,-63,63,'GaugeComponent Gauge',gMark({value:100,x,y,min:80,max:120,r:38,sa:-63,ea:63,cls:'WhiteStroke Stroke2',outer:1,mo:1.1})+
        gMark({value:Math.max(80,flow),x,y,min:80,max:120,r:38,sa:-63,ea:63,cls:(pack[e]?'GaugeIndicator':'AmberLine Stroke3')+' Gauge LineCapRound',indicator:1,mo:1.1}))+
      valveS(x,y,15,pack[e]?'V':'H','GreenLine BackgroundFill')+`</g>`};
  const eng=(x,y,n)=>{const e=n-1,l=n===1,n2=D.E[e].n2,hp=n2<80,psi=Math.round((hp?36:44)/2)*2,tmp=Math.round((150+(n2-58)*1.3)/5)*5,open=prv[e];
    return`<g id="bleed-${n}">`+pth(`M ${x},${y} l -47,10 l 0,123 l 14,0`,'GreyStroke Stroke2')+pth(`M ${x-47},${y+64} l 14,0`,'GreyStroke Stroke2')+
      pth(`M ${x},${y} l +47,10 l 0,123 l -14,0`,'GreyStroke Stroke2')+pth(`M ${x+47},${y+64} l -14,0`,'GreyStroke Stroke2')+
      tx(x-56,y+64,'C','White Standard End')+tx(x+58,y+64,'H','White Standard')+tx(x-55,y+132,'LO','White Standard End')+tx(x+61,y+132,'HI','White Standard')+
      gauge(x,y+150,e)+
      pth(`M ${x},${y+247} l -27,0 l 0,54 l 54,0 l 0,-54 l -27,0`,'GreyStroke Stroke2')+
      tx(l?x+40:x-70,y+270,'PSI','Cyan Standard')+tx(l?x+40:x-70,y+298,'°C','Cyan Standard')+
      tx(x,y+270,String(psi),'Large Center Green')+tx(x+20,y+295,String(tmp),'Large End Green')+
      (open?pth(`M ${x},${y+340} l 0,-37`,'GreenLine'):'')+valveS(x,y+355,15,open?'V':'H','GreenLine')+
      pth(`M ${x},${y+415} l 0,-45`,'GreenLine')+tx(x+2,y+433,'IP','White Center Standard')+
      valveS(l?x+47:x-47,y+398,15,hp?'H':'V','GreenLine')+pth(`M ${l?x+92:x-92},${y+415} l 0,-17 l ${l?'-29':'29'},0`,'GreenLine')+
      tx(l?x+95:x-90,y+433,'HP','White Center Standard')+(hp?pth(`M ${l?x+33:x-33},${y+398} l ${l?'-33':'33'},0`,'GreenLine'):'')+
      tx(l?x-61:x+58,423,String(n),'Huge White')+`</g>`};
  const apuV=Y.apu?`<g id="apu-bleed">`+(Y.apuBleed?pth(`M 300,${338-15} l 0,-57`,'GreenLine'):'')+valveS(300,338,15,Y.apuBleed?'V':'H','GreenLine')+pth(`M 300,${338+15} l 0,19`,'GreenLine')+tx(300,338+52,'APU','Large White Center')+`</g>`:'';
  return`<g class="p-bleed">`+tx(6,18,'BLEED','PageTitle','dominant-baseline="central"')+
    triS(185,24,'Green',0,0,0.75)+triS(300,24,'Green',0,0,0.75)+triS(429,24,'Green',0,0,0.75)+pth('M 135,62 l 0,-19 l 329,0 l 0,19','GreenLine')+
    valveS(300,93,15,'H','GreenLine')+pth('M 300,108 l 0,19','GreenLine')+tx(300,145,'RAM','Large White Center')+tx(300,166,'AIR','Large White Center')+
    `<g id="cross-bleed">`+pth('M 135, 227 l 0,82','GreenLine')+(xOpen?pth('M 135,267 l 165,0','GreenLine')+pth('M 300,267 l 40,0','GreenLine')+pth('M 370,267 l 94,0','GreenLine'):'')+
    valveS(355,267,15,xOpen?'H':'V','GreenLine')+pth('M 464,227 l 0,82','GreenLine')+`</g>`+
    apuV+eng(135,62,1)+eng(464,62,2)+
    (Y.gnd?`<g id="CompressedAir">`+triS(248,274,'White',0,0,0.75)+tx(250,306,'GND','Medium White Center')+`</g>`:'')+`</g>`}

/* ---------- CAB PRESS (SD/Pages/Press, 600 units) ---------- */
function pgPress(D){const c=D.cab,dP=c.dp,cv=c.vs,ca=c.alt,y=165,R=50,dpx=110,vsx=275,cax=455,Y=sdSys(D);
  const dpS=split1(Math.max(-9.9,Math.min(9.9,dP))),amb=dP<-0.4||dP>=8.5?'Amber':'Green',caR=Math.round(ca/50)*50,caC=caR>=9550?'Red':caR>=8800?'GreenTextPulse':'Green';
  const vsR=Math.round(Math.max(-6350,Math.min(6350,cv))/50)*50,vsP=Math.abs(vsR)>1750;
  const dpG={x:dpx,y,min:-1,max:9,r:R,sa:210,ea:50},vsG={x:vsx,y,min:-2,max:2,r:R,sa:180,ea:0},caG={x:cax,y,min:-0.625,max:10.625,r:R,sa:210,ea:50};
  const outflow=Y.gnd?100:Math.max(4,Math.min(80,62-dP*6.6+Math.abs(cv)*0.01));
  const sysT=(n,x)=>n===1?tx(x,290,'SYS 1','Large Green'):'';
  const pack=(n,x)=>triS(x+38,495-45,'Green',0,0)+tx(x,495,'PACK '+n,'Large White');
  return`<g class="p-press">`+tx(6,18,'CAB PRESS','PageTitle','dominant-baseline="central"')+
    `<g id="LandingElevation">`+tx(280,25,'LDG ELEV','Large Center')+tx(350,25,'AUTO','Large Green')+tx(510,25,String(Math.round(c.ldg/50)*50),'Large Green','text-anchor="end"')+tx(525,25,'FT','Medium Cyan')+`</g>`+
    sysT(1,180)+
    `<g id="DeltaPressure">`+tx(dpx-5,80,'ΔP','Large Center')+tx(dpx-5,100,'PSI','Medium Center Cyan')+
      tx(dpx+38,y+25,dpS[0],'Huge End '+amb)+tx(dpx+53,y+25,'.','Huge End '+amb)+tx(dpx+63,y+25,dpS[1],'Standard End '+amb)+
      gArc(dpx,y,R,210,50,'Gauge',gArc(dpx,y,R,40,50,'Gauge Amber')+gArc(dpx,y,R,210,218,'Gauge Amber')+
        gMark({...dpG,value:8,cls:'GaugeText',showValue:1,ny:10})+gMark({...dpG,value:4,cls:'GaugeText'})+gMark({...dpG,value:0,cls:'GaugeText',showValue:1,ny:-10,nx:5})+
        gMark({...dpG,value:Math.max(-1,Math.min(9,Math.round(dP*10)/10)),cls:'GaugeIndicator'+(amb==='Amber'?' Amber':''),indicator:1}))+`</g>`+
    `<g id="VsIndicator">`+tx(vsx+15,80,'V/S','Large Center')+tx(vsx+20,100,'FT/MIN','Medium Center Cyan')+tx(vsx+85,y+5,String(vsR),'Huge End '+(vsP?'GreenTextPulse':'Green'))+
      gArc(vsx,y,R,170,10,'GaugeComponent Gauge',gMark({...vsG,value:2,cls:'GaugeText',showValue:1,ny:10})+gMark({...vsG,value:1,cls:'GaugeText'})+gMark({...vsG,value:0,cls:'GaugeText',showValue:1,nx:10})+
        gMark({...vsG,value:-1,cls:'GaugeText'})+gMark({...vsG,value:-2,cls:'GaugeText',showValue:1,ny:-10})+
        gMark({...vsG,value:Math.max(-2.25,Math.min(2.25,vsR/1000)),cls:'GaugeIndicator'+(vsP?' GreenIndicatorPulse':''),indicator:1}))+`</g>`+
    `<g id="CaIndicator">`+tx(cax+15,80,'CAB ALT','Large Center')+tx(cax+20,100,'FT','Medium Center Cyan')+tx(cax+85,y+25,String(Math.round(Math.max(-9950,Math.min(32750,ca))/50)*50),'Huge End '+caC)+
      gArc(cax,y,R,210,50,'Gauge',gArc(cax,y,R,30,50,'Gauge Red')+gMark({...caG,value:10,cls:'GaugeText',showValue:1,ny:15})+gMark({...caG,value:5,cls:'GaugeText',ny:10})+
        gMark({...caG,value:0,cls:'GaugeText',showValue:1,ny:-10,nx:5})+gMark({...caG,value:Math.max(-0.625,Math.min(10.625,Math.round(ca/25)*25/1000)),cls:'GaugeIndicator '+(caC==='GreenTextPulse'?'GreenIndicatorPulse':caC),indicator:1}))+`</g>`+
    grp(-5,-25,'<polyline class="AirPressureShape" points="140,460 140,450 75,450 75,280 540,280 540,300"/><polyline class="AirPressureShape" points="180,457 180,450 265,450 265,457"/>'+
      '<polyline class="AirPressureShape" points="305,460 305,450 380,450"/><polyline class="AirPressureShape" points="453,450 540,450 540,380 550,380"/><line class="AirPressureShape" x1="540" y1="340" x2="547" y2="340"/>')+
    tx(490,305,'SAFETY','Large White')+gMark({value:2,x:545,y:315,min:0,max:2,r:34,sa:90,ea:180,cls:'GreenLine',indicator:1})+'<circle class="WhiteCircle" cx="545" cy="315" r="3"/>'+
    tx(185,380,'VENT','Large White')+tx(120,417,'INLET','Large White')+gMark({value:Y.gnd?0:2,x:175,y:434,min:0,max:2,r:34,sa:180,ea:270,cls:'GreenLine',indicator:1})+'<circle class="WhiteCircle" cx="175" cy="434" r="3"/>'+
    tx(240,417,'OUTLET','Large White')+gMark({value:Y.gnd?2:0,x:260,y:434,min:0,max:2,r:34,sa:90,ea:180,cls:'GreenLine',indicator:1})+'<circle class="WhiteCircle" cx="260" cy="434" r="3"/>'+
    `<g id="OutflowValve">`+gArc(448,425,72,270+outflow/100*90,360,'Gauge',gArc(448,425,72,355.5,360,'Gauge Amber')+
      gMark({value:outflow,x:448,y:425,min:0,max:100,r:72,sa:270,ea:360,cls:'GreenLine',indicator:1,mo:1})+
      [25,50,75].map(v=>gMark({value:v,x:448,y:425,min:0,max:100,r:72,sa:270,ea:360,cls:'Gauge',outer:1,mo:1.1})).join(''))+'<circle class="WhiteCircle" cx="448" cy="425" r="3"/></g>'+
    pack(1,47)+pack(2,478)+`</g>`}

/* ---------- ELEC (SD/Pages/Elec, 600 units) ---------- */
function pgElec(D){const Y=sdSys(D),AS=13.737375;
  const W=(d,amber)=>`<path class="${amber?'Amber':'Green'}" d="${d}"/>`;
  const arrow=(x,y,dir,cls)=>{const c=cls?` class="${cls}"`:'';return dir==='up'?`<path${c} d="M${x} ${y}h${AS} l-6.8685 -8.99325z"/>`:dir==='down'?`<path${c} d="M${x} ${y}h-${AS} l6.8685 8.99325z"/>`:dir==='right'?`<path${c} d="M${x} ${y}v${AS} l8.99325 -6.8685z"/>`:`<path${c} d="M${x} ${y}v-${AS} l-8.99325 6.8685z"/>`};
  const box=(w,h)=>`<rect class="Box" width="${w}" height="${h}"/>`;
  const prop=(x,y,v,u,ok=true)=>grp(x,y,`<text class="Right ${ok?'Green':'Amber'}">${Math.round(v)}</text><text x="3.75" class="Cyan">${u}</text>`);
  const bus=(x,y,w,name,num,ok)=>grp(x,y,`<rect width="${w}" height="26.25" class="Bus"/><text x="${w/2}" y="21" class="QuiteLarge ${num?'Right':'Middle'} ${ok?'Green':'Amber'}">${name}</text>`+(num?`<text x="${w/2+3.75}" y="22" class="ExtraLarge ${ok?'Green':'Amber'}">${num}</text>`:''));
  const battery=(x,y,n,auto)=>grp(x,y,box(86.25,71.25)+`<text x="52.5" y="21.625" class="Right">BAT</text><text x="56.25" y="21.625" class="Large">${n}</text>`+
    (auto?prop(52.5,43.125,28,'V')+prop(52.5,65.625,0,'A'):'<text x="43.125" y="41.25" class="Middle" dominant-baseline="middle">OFF</text>'));
  const batWire=(x,y,closed)=>closed?grp(x,y,W('M0.3 0 h36.15 h-36.15')):'';
  const gen=(x,y,n,load)=>grp(x,y,box(86.25,93.75)+`<text x="54.375" y="22.5" class="Right">GEN</text><text x="58.125" y="22.5" class="Large">${n}</text>`+
    prop(54.375,45,load,'%')+prop(54.375,67.5,115,'V')+prop(54.375,90,400,'HZ'));
  const apuGen=(x,y,on)=>{const t='<text x="46.875" y="18.75" class="Middle">APU GEN</text>';
    return grp(x,y,on?box(93.75,90)+t+prop(58.125,41.25,0,'%')+prop(58.125,63.75,115,'V')+prop(58.125,86.25,400,'HZ'):t)};
  const extPwr=(x,y)=>grp(x,y,box(93.75,67.5)+'<text x="46.875" y="18.75" class="Middle">EXT PWR</text>'+prop(52.5,41.25,115,'V')+prop(52.5,63.75,400,'HZ'));
  const trBox=(x,y,n,a,titleOnly)=>{const t=`<text x="${n===3?80:50}" y="24.375" class="Right">${n===3?'ESS TR':'TR'}</text>`;
    return grp(x,y,titleOnly?t:box(86.25,75)+t+(n!==3?`<text x="53.75" y="24.375" class="Large">${n}</text>`:'')+prop(54.375,46.875,28,'V')+prop(54.375,69.375,a,'A'))};
  const idg=(x,y,n)=>grp(x,y,`<text>IDG</text><text x="39.38" class="Large">${n}</text>`);
  const idgT=(x,y,t)=>grp(x,y,`<text class="Green Right">${t}</text><text x="3.75" class="Cyan">°C</text>`);
  const anyBat=Y.bat[0]||Y.bat[1];
  return`<g class="p-elec">`+tx(6,18,'ELEC','PageTitle','dominant-baseline="central"')+
    batWire(196.611875,50.77125,Y.bat[0])+batWire(367.724375,50.77125,Y.bat[1])+
    W('M56.25 117 v44.1 v-44.1')+W('M56.25 238.35 v29 v-29')+W('M536.25 117 v44.1 v-44.1')+W('M536.25 238.35 v29 v-29')+W('M138.57 279.32 h94.63 h-94.63')+
    W('M90.15 103.125 h168.69 v-44 v58.40 v-14.4')+W('M 341.16 103.125 h 166.66 h -166.66 v -42.52 v42.52')+
    arrow(258.84-AS/2,157.58,'up')+arrow(326.25,214.77,'left')+
    W('M56.44 302.81 v42.5 v-42.5')+W('M536.25 302.81 v42.5 v-42.5')+arrow(56.25-AS/2,303.77,'up','Green')+arrow(536.25-AS/2,303.77,'up','Green')+
    battery(108.75,10,1,Y.bat[0])+battery(405,10,2,Y.bat[1])+bus(232.5,35,135,anyBat?'DC BAT':'XX',0,anyBat)+
    bus(6,90,86.25,'DC',1,true)+bus(507.75,90,86.25,'DC',2,true)+bus(232.5,116.25,135,'DC ESS',0,true)+
    bus(6,266.25,135,'AC',1,true)+bus(459,266.25,135,'AC',2,true)+bus(232.5,266.25,135,'AC ESS',0,true)+
    gen(13.125,345,1,35)+gen(493.125,345,2,33)+apuGen(168.75,367.5,Y.apu)+(Y.ext?extPwr(315,390):'')+
    trBox(13.125,161.25,1,75)+trBox(493.125,161.25,2,70)+trBox(213.75,161.25,3,0,true)+
    grp(330,161.25,'<text class="Medium" dominant-baseline="middle" x="0.9375" y="45">EMER GEN</text>')+
    idg(28.13,476.25,1)+idgT(135,476.25,Y.air?75:50)+idg(513.75,476.25,2)+idgT(480,476.25,Y.air?75:50)+`</g>`}

/* ---------- HYD (SD/Pages/Hyd, 768 units) ---------- */
function pgHyd(D){const run=D.E.map(e=>e.n2>15);
  const lv={GREEN:{max:14.5,low:3.5,norm:2.6,q:13},BLUE:{max:6.5,low:2.4,norm:1.6,q:6},YELLOW:{max:12.5,low:3.5,norm:2.6,q:11.5}};
  const pump=(sys,y,on)=>{const up=sys==='GREEN'?-151:sys==='BLUE'?-153:-84;
    return grp(0,y,`<line class="GreenLine" x1="0" y1="-42" x2="0" y2="${up}"/><rect class="${on?'GreenLine':'AmberLine'}" x="-21" y="-42" width="42" height="42"/>`+
      (on?'<line class="GreenLine" x1="0" y1="-1" x2="0" y2="-41"/>':'<line class="AmberLine" x1="-12" y1="-21" x2="12" y2="-21"/>'))};
  const fire=y=>grp(0,y,'<line class="GreenLine" x1="0" y1="0" x2="0" y2="-68"/><circle class="GreenLine" cx="0" cy="21" r="21"/><line class="GreenLine" x1="0" y1="42" x2="0" y2="0"/>');
  const resv=sys=>{const v=lv[sys],lpp=121/v.max,rh=lpp*v.low,ur=(-rh).toFixed(0),lnorm=(-121+lpp*v.norm).toFixed(0),fh=-(lpp*v.q);
    return grp(0,576,`<line class="GreenLine" x1="0" y1="-121" x2="0" y2="${sys==='BLUE'?-205:-161}"/><line class="WhiteLine" x1="0" y1="${ur}" x2="0" y2="-121"/>`+
      `<line class="GreenLine" x1="0" y1="-121" x2="6" y2="-121"/><line class="GreenLine" x1="6" y1="${lnorm}" x2="6" y2="-121"/><line class="GreenLine" x1="0" y1="${lnorm}" x2="6" y2="${lnorm}"/>`+
      `<rect class="AmberLine" x="0" y="${ur}" width="6" height="${rh}"/><line class="GreenLine" x1="0" y1="0" x2="-12" y2="0"/><line class="GreenLine" x1="-12" y1="0" x2="-12" y2="${fh}"/>`+
      `<line class="GreenLine" x1="0" y1="${fh}" x2="-12" y2="${fh}"/><line class="GreenLine" x1="0" y1="${fh}" x2="-13" y2="${fh-11}"/>`)};
  const sys=(name,x,eng)=>{const p=eng==null||run[eng]?3000:0,lo=p<=1450,b=name==='BLUE';
    return grp(x,65,triS(0,0,lo?'Amber':'Green',0,0)+tx(name==='GREEN'?-2:b?1:3,50,name,'Huge Center'+(lo?' Amber':''))+tx(1,92,String(p),'Huge Center '+(lo?'Amber':'Green'))+
      `<line class="${lo?'AmberLine':'GreenLine'}" x1="0" y1="${b?217:151}" x2="0" y2="103"/>`+pump(name,b?370:303,true)+(b?'':fire(372))+resv(name))};
  const ptu=grp(383,216,'<line id="ptu2" class="GreenLine" x1="-107" y1="0" x2="-20" y2="0"/><path id="ptu3" class="GreenLine" d="M-20 0 A20 20 0 0 0 20 0"/><line id="ptu4" class="GreenLine" x1="20" y1="0" x2="56" y2="0"/>'+
    tx(92,10,'PTU','Large')+triS(-131,0,'Green',0,-90,4/3)+triS(56,0,'Green',0,-90,4/3)+triS(177,0,'Green',0,90,4/3));
  const rat=grp(372,282,tx(-78,10,'RAT','Large')+triS(0,0,'White',0,90,4/3));
  return`<g class="p-hyd ecam-common-styles">`+svg768(tx(351,39,'HYD','Title UnderlineWhite')+tx(187,404,'1',(run[0]?'':'Amber ')+'Title')+tx(562,404,'2',(run[1]?'':'Amber ')+'Title')+
    sys('GREEN',136,0)+sys('BLUE',383,null)+sys('YELLOW',630,1)+ptu+rat+tx(420,384,'ELEC','Large')+
    tx(676,292,'ELEC','Large')+triS(642,283,'White',0,-90,4/3)+`<line class="GreenLine" x1="630" y1="217" x2="630" y2="283"/>`+
    tx(243,157,'PSI','Cyan Standard')+tx(481,157,'PSI','Cyan Standard'))+`</g>`}

/* ---------- APU (SD/Pages/Apu, 600 units) ---------- */
function pgApu(D){const Y=sdSys(D),on=Y.apu,n=on?100:0,egt=on?345:Math.round(satC()),egtD=Math.round(egt/5)*5,warn=1090;
  const nG={x:-1,y:50,min:0,max:120,r:50,sa:240,ea:60},eG={x:-1,y:50,min:3,max:11,r:50,sa:240,ea:90};
  const gen=grp(105,100,(on?'<rect class="Box" width="100" height="111"/>':'')+'<text x="50" y="20" class="Center FontNormal">APU GEN</text>'+
    (on?grp(60,55,'<text x="0" y="0" class="Right FontLarger Green">0</text><text x="0" y="25" class="Right FontLarger Green">115</text><text x="0" y="50" class="Right FontLarger Green">400</text>')+
      grp(70,55,'<text x="0" y="0" class="Cyan FontNormal">%</text><text x="0" y="25" class="Cyan FontNormal">V</text><text x="0" y="50" class="Cyan FontNormal">HZ</text>'):''));
  const bOpen=Y.apuBleed,psi=bOpen?Math.round(35/2)*2:0;
  const bleed=grp(420,153,'<rect class="Box" width="100" height="57"/><text x="50" y="22" class="Center FontNormal">BLEED</text>'+
    `<text x="44" y="48" class="FontLarger Right Green">${psi}</text><text x="90" y="48" class="Cyan FontNormal Right">PSI</text>`+
    '<line class="Line Green" x1="50" y1="-1" x2="50" y2="-22"/><circle class="Circle Green" cx="50" r="18" cy="-40"/>'+
    `<line class="Line Green" x1="${bOpen?50:32}" y1="${bOpen?-58:-40}" x2="${bOpen?50:68}" y2="${bOpen?-22:-40}"/>`+
    (bOpen?'<line class="Line Green" x1="50" y1="-57" x2="50" y2="-72"/><polygon class="Circle Green" points="40,-72 50,-92 60,-72"/>':''));
  const nGauge=grp(155,295,gArc(0,50,50,240,60,'Line White NoFill',gArc(0,50,50,40,60,'Line Red NoFill',
      gMark({...nG,value:0,cls:'GaugeText',nx:3,ny:-8,showValue:1,bold:1})+gMark({...nG,value:50,cls:'GaugeText',bold:1})+gMark({...nG,max:12,value:10,cls:'GaugeText',showValue:1,ny:10,bold:1})+
      gMark({...nG,value:102,cls:'NoFill AmberHeavy',outer:1,mo:1.2})+gMark({...nG,x:0,value:n,cls:'Line Green',indicator:1})))+
    grp(80,13,'<text x="0" y="0" class="White Center FontNormal">N</text><text x="0" y="30" class="Cyan Center FontNormal">%</text>')+tx(10,80,String(n),'FontLarger Left Green'));
  const eGauge=grp(155,410,gArc(0,50,50,240,90,'Line White NoFill',gMark({...eG,value:3,cls:'GaugeText',nx:3,ny:-8,showValue:1,bold:1})+gMark({...eG,value:7,cls:'GaugeText',nx:1,ny:10,showValue:1,bold:1})+
      gMark({...eG,value:10,cls:'GaugeText',nx:-12,ny:3,showValue:1,bold:1})+gMark({x:-1,y:50,min:300,max:1100,r:50,sa:240,ea:90,value:warn-33,cls:'NoFill AmberHeavy',outer:1,mo:1.2})+
      gArc(0,50,50,240,90,'Line Red NoFill')+gArc(0,50,50,240,240+(Math.max(300,warn-300)/800)*210,'Line White NoFill')+
      gMark({x:0,y:50,min:300,max:1100,r:50,sa:240,ea:90,value:egt<300?300:egtD,cls:'Line Green',indicator:1}))+
    grp(80,13,'<text x="0" y="0" class="White Center FontNormal">EGT</text><text x="0" y="30" class="Cyan Center FontNormal" letter-spacing="-2">°C</text>')+tx(10,80,String(egtD),'FontLarger Left Green'));
  return`<g class="p-apu">`+tx(283,33,'APU','PageTitle','dominant-baseline="central"')+(on?grp(305,85,'<text x="0" y="0" class="Green FontTitle Center">AVAIL</text>'):'')+gen+bleed+
    grp(83,252,'<line class="Line Grey" x1="0" y1="0" x2="0" y2="26"/><line class="Line Grey" x1="-1" y1="0" x2="456" y2="0"/><line class="Line Grey" x1="455" y1="0" x2="455" y2="26"/>')+
    nGauge+eGauge+grp(370,335,on?'<text class="Green FontNormal" x="0" y="60">FLAP OPEN</text>':'')+`</g>`}

/* ---------- COND (SD/Pages/Cond, 768 units) ---------- */
function pgCond(){const unit=(t,x,cab,trim,valve)=>grp(x,105,tx(47,23,t,'Large Center')+tx(26,56,String(cab),'Large Green')+tx(29,106,String(trim),'Standard Green')+
    tx(-2,147,'C','Standard')+tx(74,146,'H','Standard')+`<g transform="rotate(${Math.round(-43+valve*86/100)} 42 158)">${pth('m 37,137 l 10,0 l -5,-9 z','GreenLine')}<line class="GreenLine" x1="42" y1="158" x2="42" y2="138"/></g>`+
    '<line class="GreenLine" x1="42" y1="207" x2="42" y2="158"/><g><path class="WhiteLine" d="m 21,136 a 30 30 0 0 1 42 0"/><line class="WhiteLine" x1="42" y1="118" x2="42" y2="127"/></g>');
  return`<g class="p-cond ecam-common-styles">`+svg768(`<g id="titleAndWarnings">`+tx(7,33,'COND','Title UnderlineWhite')+tx(630,32,'TEMP','Huge')+tx(715,32,':','Huge')+tx(726,31,'°C','Standard Cyan')+`</g>`+
    pth('m 95,128 l 27,-9 l 11,-12 a 75 75 0 0 1 40 -13 h 430 l 12,10','LightGreyLine')+pth('m 94,172 a 150 150 0 0 0 60 18 h 20 m 49,0 h 122 m 49,0 h 120 m 50,0 h 38 l 12,-10','LightGreyLine')+
    pth('m 278,94 v96 m 179,0 v-54','LightGreyLine')+unit('CKPT',153,22,20,45)+unit('FWD',324,23,21,50)+unit('AFT',494,23,22,52)+
    `<g id="ValveAndTubes"><text class="MediumLarge"><tspan x="706" y="306" letter-spacing="1">HOT</tspan><tspan x="706" y="336" letter-spacing="2">AIR</tspan></text>`+
    valveS(650,312,21,'H','GreenLine')+'<line class="GreenLine" x1="195" y1="312" x2="627" y2="312"/><line class="GreenLine" x1="672" y1="312" x2="696" y2="312"/></g>')+`</g>`}

/* ---------- STATUS (SDv2/Pages/Status, 768 units): FWC text "\r\r              \x1b<3mNORMAL", 30 px lines, 16 px letters ---------- */
function pgSts(){return`<g class="p-sts sdv2">`+svg768(tx(316,38,'STATUS','F36 White Underline')+
    `<text x="8" y="118"><tspan x="${8+14*16}" y="${118+2*30}" class="Green EWDWarn">NORMAL</tspan></text>`+ln(483,96,483,593,'SW4 Grey LineRound'))+`</g>`}

/* ---------- entry point ---------- */
function sdPageSvg(pg){if(!SDP_PORTED.includes(pg))return'';const D=sdData();
  const body={eng:pgEng,crz:pgCrz,wheel:pgWheel,fuel:pgFuel,door:pgDoor,fctl:pgFctl,bleed:pgBleed,press:pgPress,elec:pgElec,hyd:pgHyd,apu:pgApu,cond:pgCond,sts:pgSts}[pg](D);
  /* pages whose FlyByWire drawing reaches a few units below the permanent-data line (y 494) are scaled uniformly to fit, centred, from the top */
  const k=SDP_FIT[pg],fit=k?` transform="translate(${300-300*k},0) scale(${k})"`:'';
  return`<defs><clipPath id="sdclip"><rect x="0" y="0" width="600" height="494"/></clipPath></defs><g clip-path="url(#sdclip)"><g${fit}>${body}</g></g>`}
const SDP_FIT={fuel:0.984,bleed:0.983,press:0.979,hyd:0.98,apu:0.989};
window.sdPageSvg=sdPageSvg;window.SDP_PORTED=SDP_PORTED;
