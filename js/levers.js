'use strict';
/* ================= LEVERS: thrust levers, flaps lever, landing gear lever with LDG GEAR indication and AUTO BRK =================
   Shown in place of the lower ECAM display (SD), the upper ECAM stays visible. Built from John's cockpit images: the moving parts
   (gear lever, thrust lever blocks, flaps knob) are cut-out images moved over the panels; the lights (LDG GEAR green triangles,
   red UNLK in transit, AUTO BRK blue ON and green DECEL, BRK FAN ON) are drawn over the pushbuttons. Commands go to lever(). */
const LVP={on:false};
const IMG_LVG='img/lv-gear.webp',IMG_LVGL='img/lv-gear-lever.webp',IMG_LVT='img/lv-thr.webp',IMG_LVTL='img/lv-thr-l.webp',IMG_LVTR='img/lv-thr-r.webp',
  IMG_LVF='img/lv-flaps.webp',IMG_LVFK='img/lv-flaps-knob.webp',IMG_LVE='img/lv-eng.webp';
/* thrust lever positions on the quadrant image (y of the scale marks: TOGA, FLX/MCT, CL, the white 0 line, the REV zone to FULL);
   the centre of the handles is put on the mark */
const THR_POS=[['TOGA','TOGA',73],['FLX','FLX/MCT',101],['CL','CL',135],['N50','50% N1',209],['IDLE','IDLE',283],['REVIDLE','IDLE REV',327],['REVMAX','MAX REV',375]];   /* quadrant image cropped 125 px at the top */
const FLP_Y=[60,120,180,240,290];
/* layout: thrust quadrant on the left over the full height, its buttons beside it; landing gear panel (smaller) top right,
   flaps lever (knob and gate only) below it */
function leversSvg(){const G='#3cff3c',B='#3ad7ff',R='#ff3b30',ln='#e8eef5';
  const t=(x,y,s,sz,c,a,w)=>`<text x="${x}" y="${y}" fill="${c||ln}" font-size="${sz||14}" text-anchor="${a||'middle'}" font-family="'IBM Plex Sans',Arial,sans-serif" font-weight="${w||700}">${s}</text>`;
  const btn=(x,y,w,h,k,v,lbl,on,c,sz)=>`<g class="lvk" data-lv="${k}" data-v="${v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#15191e" stroke="${on?G:'#7d8a99'}" stroke-width="${on?2.5:1.5}"/>${t(x+w/2,y+h/2+5,lbl,sz||13,on?G:(c||ln))}</g>`;
  const hit=(x,y,w,h,k,v)=>`<rect class="lvk" data-lv="${k}" data-v="${v}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" style="cursor:pointer"/>`;
  let s=`<rect x="0" y="0" width="600" height="530" fill="#2a313c"/>`;
  /* ---- left: thrust quadrant (image 316 x 563) with its buttons, ENG MASTER panel (image 563 x 392) under it ---- */
  {const k=335/563;s+=`<g transform="scale(${k})"><image href="${IMG_LVT}" x="0" y="0" width="316" height="563"/>`;
    const y=THR_POS.find(p=>p[0]===LV.thr)[2]-58;   /* handle images 117 high: centre on the mark */
    s+=`<image href="${IMG_LVTL}" x="34" y="${y}" width="128" height="117"/><image href="${IMG_LVTR}" x="170" y="${y}" width="128" height="117"/></g>`}
  THR_POS.forEach(([k,l],i)=>{s+=btn(192,2+i*47.5,84,42,'thr',k,l.replace('FLX/MCT','FLX MCT'),LV.thr===k,k.startsWith('REV')?'#ff9a55':null,12)});
  s+=`<image href="${IMG_LVE}" x="0" y="339" width="276" height="192"/>`;
  /* ---- right top: landing gear panel (image 676 x 333) ---- */
  {const x0=282,k=318/676;s+=`<g transform="translate(${x0},2) scale(${k})"><image href="${IMG_LVG}" x="0" y="0" width="676" height="333"/>`;
    const gp=flying()?(FL.gearPos??1):1,dn=gp>=1,tr=gp>0&&gp<1;
    [56,140,224].forEach(x=>{if(!dn)s+=`<rect x="${x+8}" y="106" width="64" height="44" fill="#222428"/>`;if(tr)s+=t(x+40,104,'UNLK',17,R)});
    if(LV.fan)s+=t(396,136,'ON',12,B);
    [['LO',84],['MED',166],['MAX',270]].forEach(([m,x])=>{const on=LV.abrk===m;if(on)s+=`<rect x="${x-24}" y="284" width="48" height="16" fill="#0e1216"/>`+t(x,297,'ON',14,B);
      if(on&&LV.decel)s+=t(x,262,'DECEL',13,G);s+=hit(x-40,240,80,70,'abrk',m)});
    s+=hit(356,80,80,76,'fan','x');
    if(!LV.askid)s+=`<circle cx="395" cy="258" r="24" fill="#1a1d22"/><rect x="389" y="258" width="12" height="38" rx="5" fill="#2c3036" stroke="#555"/>`;
    s+=hit(350,216,70,92,'askid','x');
    const up=LV.gear==='UP';s+=`<image href="${IMG_LVGL}" x="524" y="${up?40:226}" width="42" height="107"/>`   /* only the knurled grip moves; the track stays */+hit(490,0,186,333,'gear',up?'DOWN':'UP');
    s+=`</g>`;
    s+=btn(282,162,156,34,'gear','UP','GEAR UP',up)+btn(444,162,156,34,'gear','DOWN','GEAR DOWN',!up);
    s+=t(441,216,dn?'DOWN LOCKED':gp<=0?'UP LOCKED':'IN TRANSIT',12,dn?G:gp<=0?ln:R)}
  /* ---- right bottom: flaps lever, knob and gate only (image 240 x 302), smaller ---- */
  {const k=246/302,x0=300;s+=`<g transform="translate(${x0},230) scale(${k})"><image href="${IMG_LVF}" x="0" y="0" width="240" height="302"/>`;
    const y=FLP_Y[LV.flaps]-20;s+=`<image href="${IMG_LVFK}" x="${128-70}" y="${y-53}" width="140" height="107"/>`;
    FLP_Y.forEach((yy,i)=>{s+=hit(0,yy-20-28,240,56,'flaps',i)});s+=`</g>`;
    const cf=flying()?FL.conf:['0','1+F','2','3','FULL'][LV.flaps];s+=t(522,240,'FLAPS',13,ln,'start')+t(596,240,cf==='0'?'CLEAN':cf,13,'#ffd9a0','end')}
  /* buttons level with the gate marks (image y = mark - 20, scale 246/302, from y 230) */
  ['0','1','2','3','FULL'].forEach((l,i)=>{const cy=230+(FLP_Y[i]-20)*246/302;s+=btn(522,cy-16,74,32,'flaps',i,l,LV.flaps===i,null,13)});
  return s}
function drawLevers(){const o=$('#lvPanel');if(!o)return;o.hidden=!LVP.on;const b=$('#lvBtn');if(b){b.setAttribute('aria-pressed',String(LVP.on));b.textContent=LVP.on?'SD':'LEVERS'}
  if(!LVP.on)return;const h=leversSvg();if(o._h!==h){o.innerHTML=`<svg viewBox="0 0 600 530" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="Levers">${h}</svg>`;o._h=h}}
function buildLevers(){const sd=$('#sd');if(!sd||$('#lvPanel'))return;const box=sd.parentElement;
  box.insertAdjacentHTML('beforeend',`<div class="lv-panel" id="lvPanel" hidden></div><button type="button" class="lv-btn" id="lvBtn" aria-pressed="false" title="Thrust, flaps and landing gear levers">LEVERS</button>`);
  $('#lvBtn').addEventListener('click',()=>{LVP.on=!LVP.on;drawLevers()});
  $('#lvPanel').addEventListener('click',e=>{const g=e.target.closest('[data-lv]');if(!g)return;lever(g.dataset.lv,g.dataset.v);drawLevers()})}
buildLevers();
{const d0=window.drawEcam;window.drawEcam=function(){if(d0)d0();drawLevers()}}
window.__levers={show:on=>{LVP.on=on;drawLevers()},lever,LV};
