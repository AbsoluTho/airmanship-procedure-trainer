'use strict';
/* ================= LEVERS: speed brake lever, thrust levers with ENG MASTER, flaps lever; LDG GEAR panel with AUTO BRK =================
   LEVERS is shown in place of the lower ECAM display (SD), the upper ECAM stays visible; LDG GEAR opens the landing gear panel over the
   lower part of the upper ECAM, as the ECP opens over the ND. Built from John's cockpit images: the moving parts
   (gear lever, thrust lever blocks, flaps knob) are cut-out images moved over the panels; the lights (LDG GEAR green triangles,
   red UNLK in transit, AUTO BRK blue ON and green DECEL, BRK FAN ON) are drawn over the pushbuttons. Commands go to lever(). */
const LVP={on:false,gear:false};
const IMG_LVG='img/lv-gear.webp',IMG_LVT='img/lv-thr.webp',IMG_LVTL='img/lv-thr-l.webp',IMG_LVTR='img/lv-thr-r.webp',
  IMG_LVF='img/lv-flaps.webp',IMG_LVFK='img/lv-flaps-knob.webp',IMG_LVE='img/lv-eng.webp',IMG_LVM1='img/lv-eng-ma.webp',IMG_LVM2='img/lv-eng-mb.webp';
/* thrust lever positions on the quadrant image (y of the scale marks: TOGA, FLX/MCT, CL, the white 0 line, the REV zone to FULL);
   the centre of the handles is put on the mark */
const THR_POS=[['TOGA','TOGA',73],['FLX','FLX/MCT',101],['CL','CL',135],['N50','50% N1',209],['IDLE','IDLE',283],['REVIDLE','IDLE REV',327],['REVMAX','MAX REV',375]];   /* quadrant image cropped 125 px at the top */
const FLP_Y=[60,120,180,240,290];
const IMG_LVS='img/lv-spdbrk.webp',IMG_LVSK='img/lv-spdbrk-knob.webp';
const SPB_Y=[[0,97,'RET'],[0.5,183,'1/2'],[1,269,'FULL']];   /* y of the RET, 1/2 and FULL marks on the speed brake image (233 x 343) */
const lvT=(x,y,s,sz,c,a,w)=>`<text x="${x}" y="${y}" fill="${c||'#e8eef5'}" font-size="${sz||14}" text-anchor="${a||'middle'}" font-family="'IBM Plex Sans',Arial,sans-serif" font-weight="${w||700}">${s}</text>`;
const lvHit=(x,y,w,h,k,v)=>`<rect class="lvk" data-lv="${k}" data-v="${v}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" style="cursor:pointer"/>`;
/* layout: speed brake lever on the left, the thrust lever buttons beside it, thrust quadrant with the ENG MASTER panel under it in the centre,
   flaps lever on the right (its own position numbers are the buttons) with the configuration read-out under it.
   The landing gear panel is separate (LDG GEAR button, over the lower part of the upper ECAM). */
function leversSvg(){const G='#3cff3c',R='#ff3b30',ln='#e8eef5',t=lvT,hit=lvHit;
  const btn=(x,y,w,h,k,v,lbl,on,c,sz)=>`<g class="lvk" data-lv="${k}" data-v="${v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#15191e" stroke="${on?G:'#7d8a99'}" stroke-width="${on?2.5:1.5}"/>${t(x+w/2,y+h/2+5,lbl,sz||13,on?G:(c||ln))}</g>`;
  let s=`<rect x="0" y="0" width="600" height="530" fill="#2a313c"/>`;
  /* ---- left: speed brake lever (image 233 x 343): the knob on RET, 1/2 or FULL; the marks are the buttons ---- */
  {const k=220/343;s+=`<g transform="translate(0,24) scale(${k})"><image href="${IMG_LVS}" x="0" y="0" width="233" height="343"/>`;
    const y=(SPB_Y.find(p=>p[0]===LV.spb)||SPB_Y[0])[1];
    s+=`<image href="${IMG_LVSK}" x="73" y="${y-63}" width="125" height="127"/>`;
    SPB_Y.forEach(([v,yy])=>{s+=hit(0,yy-43,233,86,'spb',v)});s+=`</g>`;
    s+=t(75,264,'SPEED BRAKE',13,ln)}
  /* ---- centre: thrust quadrant (image 316 x 563, 328 high) with its buttons on its left; ENG MASTER panel under it ---- */
  THR_POS.forEach(([k,l],i)=>{s+=btn(160,2+i*46.6,54,42,'thr',k,l.replace('FLX/MCT','FLX MCT').replace('50% N1','50%N1'),LV.thr===k,k.startsWith('REV')?'#ff9a55':null,12)});
  {const k=328/563;s+=`<g transform="translate(222,0) scale(${k})"><image href="${IMG_LVT}" x="0" y="0" width="316" height="563"/>`;
    const y=THR_POS.find(p=>p[0]===LV.thr)[2]-58;   /* handle images 117 high: centre on the mark */
    s+=`<image href="${IMG_LVTL}" x="34" y="${y}" width="128" height="117"/><image href="${IMG_LVTR}" x="170" y="${y}" width="128" height="117"/></g>`}
  /* ENG MASTER panel (image 563 x 392, drawn 290 wide so its labels can be read): master levers OFF (down) or ON (up); always ON while the engines run (flight) */
  {const k=290/563;s+=`<g transform="translate(169,328) scale(${k})"><image href="${IMG_LVE}" x="0" y="0" width="563" height="392"/>`;
    /* MODE selector: the knob turned (panel image rotated inside a circle around the knob) CRANK -50, NORM 0, IGN START +50 deg */
    {const ang={CRANK:-50,NORM:0,IGN:50}[ENG.mode];if(ang)s+=`<clipPath id="lvKnob"><circle cx="282" cy="300" r="60"/></clipPath><circle cx="282" cy="300" r="60" fill="#14171b"/><g clip-path="url(#lvKnob)"><image href="${IMG_LVE}" x="0" y="0" width="563" height="392" transform="rotate(${ang} 282 300)"/></g>`;
      s+=hit(160,200,80,170,'mode','CRANK')+hit(240,200,84,170,'mode','NORM')+hit(324,200,80,170,'mode','IGN')}
    [[1,108,80,IMG_LVM1],[2,384,84,IMG_LVM2]].forEach(([n,x,w,im])=>{const on=LV['m'+n];s+=`<image href="${im}" x="${x}" y="${on?74:162}" width="${w}" height="89"/>`+hit(x-20,60,w+40,200,'master',n)});
    s+=`</g>`}
  /* ---- right: flaps lever (image 240 x 302): the position numbers on the lever are the buttons ---- */
  {const k=220/302,x0=424,y0=24;s+=`<g transform="translate(${x0},${y0}) scale(${k})"><image href="${IMG_LVF}" x="0" y="0" width="240" height="302"/>`;
    const y=FLP_Y[LV.flaps]-20;s+=`<image href="${IMG_LVFK}" x="${128-70}" y="${y-53}" width="140" height="107"/>`;
    FLP_Y.forEach((yy,i)=>{s+=hit(0,yy-20-28,240,56,'flaps',i)});s+=`</g>`;
    /* read-out: configuration, landing gear, speed brakes */
    const cf=flying()?FL.conf:['0','1+F','2','3','FULL'][LV.flaps],gp=flying()?(FL.gearPos??1):1,e=typeof spbEff==='function'?spbEff():0,sp=LV.spb||0;
    const sbTxt=sp===0?'RET':e===0?(flying()&&!FL.ground?'INHIBITED':sp===1?'FULL':'1/2'):e<sp?'1/2 (AP ON)':sp===1?'FULL':'1/2';
    s+=`<rect x="426" y="250" width="172" height="74" rx="8" fill="#1d232b" stroke="#55606c"/>`+t(436,271,'FLAPS',12,ln,'start')+t(588,271,cf==='0'?'CLEAN':'CONF '+cf,13,'#ffd9a0','end');
    s+=t(436,293,'LDG GEAR',12,ln,'start')+t(588,293,gp>=1?'DOWN':gp<=0?'UP':'IN TRANSIT',13,gp>=1?G:gp<=0?ln:R,'end');
    s+=t(436,315,'SPD BRK',12,ln,'start')+t(588,315,sbTxt,13,sp===0?ln:e===0||e<sp?'#ffb000':G,'end')}
  return s}
/* landing gear panel (image 676 x 333, frame trimmed: x 10..660): LDG GEAR lights, AUTO BRK, BRK FAN, A/SKID and the gear lever */
function gearSvg(){const G='#3cff3c',B='#3ad7ff',R='#ff3b30',t=lvT,hit=lvHit;let s=`<image href="${IMG_LVG}" x="0" y="0" width="676" height="333"/>`;
  const gp=flying()?(FL.gearPos??1):1,dn=gp>=1,tr=gp>0&&gp<1;
  [56,140,224].forEach(x=>{if(!dn)s+=`<rect x="${x+8}" y="106" width="64" height="44" fill="#222428"/>`;if(tr)s+=t(x+40,104,'UNLK',17,R)});
  if(LV.fan)s+=t(396,136,'ON',12,B);
  [['LO',84],['MED',166],['MAX',270]].forEach(([m,x])=>{const on=LV.abrk===m;if(on)s+=`<rect x="${x-24}" y="284" width="48" height="16" fill="#0e1216"/>`+t(x,297,'ON',14,B);
    if(on&&LV.decel)s+=t(x,262,'DECEL',13,G);s+=hit(x-40,240,80,70,'abrk',m)});
  s+=hit(356,80,80,76,'fan','x');
  if(!LV.askid)s+=`<circle cx="395" cy="258" r="24" fill="#1a1d22"/><rect x="389" y="258" width="12" height="38" rx="5" fill="#2c3036" stroke="#555"/>`;
  s+=hit(350,216,70,92,'askid','x');
  /* gear lever: fixed slot, the handle at the top (UP) or bottom (DOWN); UP / DOWN tapped on the arrows */
  {const up=LV.gear==='UP',hy=up?52:226;
    s+=`<rect x="538" y="62" width="16" height="238" rx="7" fill="#0b0d10" stroke="#3a414a"/>`;
    s+=`<g class="lvk" data-lv="gear" data-v="${up?'DOWN':'UP'}" style="cursor:pointer"><rect x="524" y="${hy}" width="44" height="84" rx="10" fill="#1d2025" stroke="#5d6772" stroke-width="2"/>`+
      [0,1,2,3,4,5,6].map(i=>`<line x1="530" x2="562" y1="${hy+14+i*9}" y2="${hy+14+i*9}" stroke="#3b424b" stroke-width="3"/>`).join('')+`</g>`;
    [['UP',592,44,64,86],['DOWN',592,150,64,148]].forEach(([v,x,y,w,h])=>{const on=LV.gear===v;
      if(on)s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${G}" stroke-width="4"/>`;s+=hit(x,y-30,w,h+(v==='UP'?30:40),'gear',v)})}
  return s}
function drawGear(){const o=$('#lgPanel');if(!o)return;o.hidden=!LVP.gear;const b=$('#lgBtn');if(b)b.setAttribute('aria-pressed',String(!!LVP.gear));
  if(!LVP.gear)return;const h=gearSvg();if(o._h!==h){o.innerHTML=`<svg viewBox="10 0 650 333" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="Landing gear panel">${h}</svg>`;o._h=h}}
function drawLevers(){const o=$('#lvPanel');if(!o)return;o.hidden=!LVP.on;const b=$('#lvBtn');if(b){b.setAttribute('aria-pressed',String(LVP.on));b.textContent=LVP.on?'SD':'LEVERS'}
  if(!LVP.on)return;const h=leversSvg();if(o._h!==h){o.innerHTML=`<svg viewBox="0 0 600 530" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="Levers">${h}</svg>`;o._h=h}}
function buildLevers(){const sd=$('#sd');if(!sd||$('#lvPanel'))return;const box=sd.parentElement,ewd=$('#ewd')&&$('#ewd').parentElement;
  box.insertAdjacentHTML('beforeend',`<div class="lv-panel" id="lvPanel" hidden></div><div class="lv-btns"><button type="button" class="lv-btn" id="lvBtn" aria-pressed="false" title="Thrust levers, speed brake, flaps and engine masters">LEVERS</button><button type="button" class="lv-btn" id="lgBtn" aria-pressed="false" title="Landing gear panel on/off">LDG GEAR</button></div>`);
  if(ewd)ewd.insertAdjacentHTML('beforeend',`<div class="lg-panel" id="lgPanel" hidden aria-label="Landing gear panel"></div>`);
  const tap=e=>{const g=e.target.closest('[data-lv]');if(!g)return;lever(g.dataset.lv,g.dataset.v);drawLevers();drawGear()};
  $('#lvBtn').addEventListener('click',()=>{LVP.on=!LVP.on;drawLevers()});
  $('#lgBtn').addEventListener('click',()=>{LVP.gear=!LVP.gear;drawGear()});
  $('#lvPanel').addEventListener('click',tap);if($('#lgPanel'))$('#lgPanel').addEventListener('click',tap)}
buildLevers();
{const d0=window.drawEcam;window.drawEcam=function(){if(d0)d0();drawLevers();drawGear()}}
window.__levers={show:on=>{LVP.on=on;drawLevers()},gear:on=>{LVP.gear=on;drawGear()},lever,LV};
