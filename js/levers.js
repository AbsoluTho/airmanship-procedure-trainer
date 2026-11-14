'use strict';
/* ================= LEVERS: thrust levers, flaps lever, landing gear lever with LDG GEAR indication and AUTO BRK =================
   Shown in place of the lower ECAM display (SD), the upper ECAM stays visible. Built from John's cockpit images: the moving parts
   (gear lever, thrust lever blocks, flaps knob) are cut-out images moved over the panels; the lights (LDG GEAR green triangles,
   red UNLK in transit, AUTO BRK blue ON and green DECEL, BRK FAN ON) are drawn over the pushbuttons. Commands go to lever(). */
const LVP={on:false};
const IMG_LVG='img/lv-gear.webp',IMG_LVGL='img/lv-gear-lever.webp',IMG_LVT='img/lv-thr.webp',IMG_LVTL='img/lv-thr-l.webp',IMG_LVTR='img/lv-thr-r.webp',
  IMG_LVF='img/lv-flaps.webp',IMG_LVFK='img/lv-flaps-knob.webp';
/* thrust lever positions on the quadrant image (y of the scale marks: TOGA, FLX/MCT, CL, the white 0 line, the REV zone to FULL);
   the centre of the handles is put on the mark */
const THR_POS=[['TOGA','TOGA',198],['FLX','FLX/MCT',226],['CL','CL',260],['N50','50% N1',334],['IDLE','IDLE',408],['REVIDLE','IDLE REV',452],['REVMAX','MAX REV',500]];
const FLP_Y=[60,120,180,240,290];
/* layout: thrust quadrant on the left over the full height, its buttons beside it; landing gear panel (smaller) top right,
   flaps lever (knob and gate only) below it */
function leversSvg(){const G='#3cff3c',B='#3ad7ff',R='#ff3b30',ln='#e8eef5';
  const t=(x,y,s,sz,c,a,w)=>`<text x="${x}" y="${y}" fill="${c||ln}" font-size="${sz||14}" text-anchor="${a||'middle'}" font-family="'IBM Plex Sans',Arial,sans-serif" font-weight="${w||700}">${s}</text>`;
  const btn=(x,y,w,h,k,v,lbl,on,c,sz)=>`<g class="lvk" data-lv="${k}" data-v="${v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#15191e" stroke="${on?G:'#7d8a99'}" stroke-width="${on?2.5:1.5}"/>${t(x+w/2,y+h/2+5,lbl,sz||13,on?G:(c||ln))}</g>`;
  const hit=(x,y,w,h,k,v)=>`<rect class="lvk" data-lv="${k}" data-v="${v}" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" style="cursor:pointer"/>`;
  let s=`<rect x="0" y="0" width="600" height="530" fill="#2a313c"/>`;
  /* ---- thrust levers: quadrant image 316 x 688 (gate and scales), the two handles slide from TOGA down to MAX REV ---- */
  {const k=530/688;s+=`<g transform="scale(${k})"><image href="${IMG_LVT}" x="0" y="0" width="316" height="688"/>`;
    const y=THR_POS.find(p=>p[0]===LV.thr)[2]-58;   /* handle images 117 high: centre on the mark */
    s+=`<image href="${IMG_LVTL}" x="34" y="${y}" width="128" height="117"/><image href="${IMG_LVTR}" x="170" y="${y}" width="128" height="117"/></g>`}
  THR_POS.forEach(([k,l],i)=>{s+=btn(250,8+i*74.5,86,62,'thr',k,l.replace('/',' /'),LV.thr===k,k.startsWith('REV')?'#ff9a55':null,12)});
  /* ---- landing gear panel (image 676 x 333), smaller, top right ---- */
  {const x0=342,k=252/676;s+=`<g transform="translate(${x0},8) scale(${k})"><image href="${IMG_LVG}" x="0" y="0" width="676" height="333"/>`;
    const gp=flying()?(FL.gearPos??1):1,dn=gp>=1,tr=gp>0&&gp<1;
    [56,140,224].forEach(x=>{if(!dn)s+=`<rect x="${x+8}" y="106" width="64" height="44" fill="#222428"/>`;if(tr)s+=t(x+40,104,'UNLK',17,R)});
    if(LV.fan)s+=t(396,136,'ON',12,B);
    [['LO',84],['MED',166],['MAX',270]].forEach(([m,x])=>{const on=LV.abrk===m;if(on)s+=`<rect x="${x-24}" y="284" width="48" height="16" fill="#0e1216"/>`+t(x,297,'ON',14,B);
      if(on&&LV.decel)s+=t(x,262,'DECEL',13,G);s+=hit(x-40,240,80,70,'abrk',m)});
    s+=hit(356,80,80,76,'fan','x');
    if(!LV.askid)s+=`<circle cx="395" cy="258" r="24" fill="#1a1d22"/><rect x="389" y="258" width="12" height="38" rx="5" fill="#2c3036" stroke="#555"/>`;
    s+=hit(350,216,70,92,'askid','x');
    const up=LV.gear==='UP';s+=`<image href="${IMG_LVGL}" x="524" y="${up?17:92}" width="48" height="230"/>`+hit(490,0,186,333,'gear',up?'DOWN':'UP');
    s+=`</g>`;
    s+=btn(342,138,124,34,'gear','UP','GEAR UP',up)+btn(470,138,124,34,'gear','DOWN','GEAR DOWN',!up);
    s+=t(468,190,dn?'DOWN LOCKED':gp<=0?'UP LOCKED':'IN TRANSIT',12,dn?G:gp<=0?ln:R)}
  /* ---- flaps lever: knob and gate only (image 240 x 302), knob on the gate positions ---- */
  {const k=290/302,x0=350;s+=`<g transform="translate(${x0},200) scale(${k})"><image href="${IMG_LVF}" x="0" y="0" width="240" height="302"/>`;
    const y=FLP_Y[LV.flaps]-20;s+=`<image href="${IMG_LVFK}" x="${128-70}" y="${y-53}" width="140" height="107"/>`;
    FLP_Y.forEach((yy,i)=>{s+=hit(0,yy-20-28,240,56,'flaps',i)});s+=`</g>`;
    const cf=flying()?FL.conf:['0','1+F','2','3','FULL'][LV.flaps];s+=t(590,222,'FLAPS',13,ln,'end')+t(590,242,cf==='0'?'CLEAN':cf,13,'#ffd9a0','end')}
  ['0','1','2','3','FULL'].forEach((l,i)=>{s+=btn(342+i*51,496,47,30,'flaps',i,l,LV.flaps===i,null,12)});
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
