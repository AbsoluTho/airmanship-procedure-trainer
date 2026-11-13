'use strict';
/* ================= SD system pages ported from FlyByWire A32NX (GPL-3.0) =================
   ENGINE, CRUISE, WHEEL, FUEL, DOOR/OXY (SD, 600 or 768 unit pages) and F/CTL (SDv2, 768 units):
   the same coordinates, shapes, classes and text sizes as the FlyByWire SVG pages, rendered as SVG
   over the lower ECAM screen. Values come from the trainer's simplified model; systems that are
   not simulated are shown in their normal state. */
const SDP_PORTED=['eng','crz','wheel','fuel','door','fctl'];
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

/* ---------- entry point ---------- */
function sdPageSvg(pg){if(!SDP_PORTED.includes(pg))return'';const D=sdData();
  const body={eng:pgEng,crz:pgCrz,wheel:pgWheel,fuel:pgFuel,door:pgDoor,fctl:pgFctl}[pg](D);
  return`<defs><clipPath id="sdclip"><rect x="0" y="0" width="600" height="494"/></clipPath></defs><g clip-path="url(#sdclip)">${body}</g>`}
window.sdPageSvg=sdPageSvg;window.SDP_PORTED=SDP_PORTED;
