'use strict';
/* ================= LEVERS: thrust levers, flaps lever, landing gear lever with LDG GEAR indication and AUTO BRK =================
   Shown in place of the lower ECAM display (SD), the upper ECAM stays visible. Built from John's cockpit images: the moving parts
   (gear lever, thrust lever blocks, flaps knob) are cut-out images moved over the panels; the lights (LDG GEAR green triangles,
   red UNLK in transit, AUTO BRK blue ON and green DECEL, BRK FAN ON) are drawn over the pushbuttons. Commands go to lever(). */
const LVP={on:false};
const IMG_LVG='img/lv-gear.webp',IMG_LVGL='img/lv-gear-lever.webp',IMG_LVT='img/lv-thr.webp',IMG_LVTL='img/lv-thr-l.webp',IMG_LVTR='img/lv-thr-r.webp',
  IMG_LVF='img/lv-flaps.webp',IMG_LVFK='img/lv-flaps-knob.webp';
/* thrust lever detents on the quadrant image (y of the CL notch = 262) and the side buttons */
const THR_POS=[['TOGA','TOGA',197],['FLX','FLX/MCT',226],['CL','CL',262],['N50','50% N1',336],['IDLE','IDLE',410],['REVIDLE','IDLE REV',470],['REVMAX','MAX REV',540]];
const FLP_Y=[60,120,180,240,290];
function leversSvg(){const G='#3cff3c',B='#3ad7ff',R='#ff3b30',ln='#e8eef5';
  const t=(x,y,s,sz,c,a,w)=>`<text x="${x}" y="${y}" fill="${c||ln}" font-size="${sz||14}" text-anchor="${a||'middle'}" font-family="'IBM Plex Sans',Arial,sans-serif" font-weight="${w||700}">${s}</text>`;
  const btn=(x,y,w,h,k,v,lbl,on,c)=>`<g class="lvk" data-lv="${k}" data-v="${v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#15191e" stroke="${on?G:'#7d8a99'}" stroke-width="${on?2.5:1.5}"/>${t(x+w/2,y+h/2+5,lbl,13,on?G:(c||ln))}</g>`;
  const hit=(x,y,w,h,k,v)=>`<rect class="lvk" data-lv="${k}" data-v="${v}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" style="cursor:pointer"/>`;
  let s=`<rect x="0" y="0" width="600" height="530" fill="#2a313c"/>`;
  /* ---- landing gear panel (image 676 x 333) ---- */
  {const k=470/676;s+=`<g transform="scale(${k})"><image href="${IMG_LVG}" x="0" y="0" width="676" height="333"/>`;
    const gp=flying()?(FL.gearPos??1):1,dn=gp>=1,tr=gp>0&&gp<1;
    [56,140,224].forEach(x=>{if(!dn)s+=`<rect x="${x+8}" y="106" width="64" height="44" fill="#222428"/>`;if(tr)s+=t(x+40,104,'UNLK',17,R)});
    if(LV.fan)s+=t(396,136,'ON',12,B);
    [['LO',84],['MED',166],['MAX',270]].forEach(([m,x])=>{const on=LV.abrk===m;if(on)s+=`<rect x="${x-24}" y="284" width="48" height="16" fill="#0e1216"/>`+t(x,297,'ON',14,B);
      if(on&&LV.decel)s+=t(x,262,'DECEL',13,G);s+=hit(x-40,240,80,70,'abrk',m)});
    s+=hit(356,80,80,76,'fan','x');
    if(!LV.askid)s+=`<circle cx="395" cy="258" r="24" fill="#1a1d22"/><rect x="389" y="258" width="12" height="38" rx="5" fill="#2c3036" stroke="#555"/>`;
    s+=hit(350,216,70,92,'askid','x');
    const up=LV.gear==='UP';s+=`<image href="${IMG_LVGL}" x="524" y="${up?17:92}" width="48" height="230"/>`+hit(490,0,186,333,'gear',up?'DOWN':'UP');
    s+=`</g>`}
  s+=btn(480,40,112,46,'gear','UP','GEAR UP',LV.gear==='UP')+btn(480,100,112,46,'gear','DOWN','GEAR DOWN',LV.gear==='DOWN');
  {const gp=flying()?(FL.gearPos??1):1;s+=t(536,176,gp>=1?'DOWN LOCKED':gp<=0?'UP LOCKED':'IN TRANSIT',12,gp>=1?G:gp<=0?ln:R)}
  /* ---- thrust levers (image 554 x 688) and their buttons ---- */
  {const k=294/688;s+=`<g transform="translate(0,236) scale(${k})"><image href="${IMG_LVT}" x="0" y="0" width="554" height="688"/>`;
    const dy=THR_POS.find(p=>p[0]===LV.thr)[2]-262;
    s+=`<image href="${IMG_LVTL}" x="190" y="${172+dy}" width="72" height="153"/><image href="${IMG_LVTR}" x="300" y="${172+dy}" width="75" height="153"/></g>`}
  THR_POS.forEach(([k,l],i)=>{s+=btn(244,240+i*41.5,128,36,'thr',k,l,LV.thr===k,k.startsWith('REV')?'#ff9a55':null)});
  /* ---- flaps lever (image 557 x 334) and its buttons ---- */
  {const k=223/557;s+=`<g transform="translate(377,236) scale(${k})"><image href="${IMG_LVF}" x="0" y="0" width="557" height="334"/>`;
    const y=FLP_Y[LV.flaps];s+=`<image href="${IMG_LVFK}" x="${128-60}" y="${y-46}" width="120" height="92"/>`;
    FLP_Y.forEach((yy,i)=>{s+=hit(0,yy-28,250,56,'flaps',i)});s+=`</g>`}
  ['0','1','2','3','FULL'].forEach((l,i)=>{s+=btn(380+i*44,380,40,36,'flaps',i,l,LV.flaps===i)});
  const cf=flying()?FL.conf:['0','1+F','2','3','FULL'][LV.flaps];s+=t(488,446,cf==='0'?'CLEAN':'CONF '+cf,15,'#ffd9a0');
  s+=t(488,474,'FLAPS LEVER',11,'#9aa6b3',null,600);
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
