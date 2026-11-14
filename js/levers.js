'use strict';
/* ================= LEVERS: thrust levers, flaps lever, landing gear lever with LDG GEAR indication and AUTO BRK =================
   Shown in place of the lower ECAM display (SD), the upper ECAM stays visible. Layout and lights after the A320 centre
   pedestal and centre instrument panel (FlyByWire A32NX cockpit): LDG GEAR green triangles when down and locked, red UNLK
   in transit; AUTO BRK pushbuttons with blue ON and green DECEL; BRK FAN; A/SKID & N/W STRG switch. Commands go to lever(). */
const LVP={on:false};
const THR_POS=[['TOGA','TOGA',290],['FLX','FLX/MCT',326],['CL','CL',362],['N50','50% N1',398],['IDLE','IDLE',434],['REVIDLE','IDLE REV',470],['REVMAX','MAX REV',506]];
function leversSvg(){const pc='#5b6b7f',ln='#e8eef5',dk='#14181d',G='#3cff3c',B='#3ad7ff',R='#ff3b30';
  const t=(x,y,s,sz,c,a)=>`<text x="${x}" y="${y}" fill="${c||ln}" font-size="${sz||14}" text-anchor="${a||'middle'}" font-family="'IBM Plex Sans',Arial,sans-serif" font-weight="600">${s}</text>`;
  const btn=(x,y,w,h,k,v,inner)=>`<g class="lvk" data-lv="${k}" data-v="${v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${dk}" stroke="#7d8a99" stroke-width="2"/>${inner||''}</g>`;
  let s=`<rect x="0" y="0" width="600" height="530" fill="${pc}"/>`;
  /* ---- LDG GEAR indication ---- */
  s+=`<rect x="10" y="10" width="300" height="230" rx="8" fill="none" stroke="#8796a7"/>`+t(110,32,'LDG GEAR',15);
  const gp=flying()?(FL.gearPos??1):1,dn=gp>=1,tr=gp>0&&gp<1;
  [20,85,150].forEach(x=>{s+=`<rect x="${x}" y="42" width="56" height="52" rx="4" fill="${dk}" stroke="#7d8a99"/>`;
    if(tr)s+=t(x+28,64,'UNLK',13,R);
    if(dn)s+=`<path d="M${x+14} ${x?72:72} L${x+42} 72 L${x+28} 86 Z" fill="none" stroke="${G}" stroke-width="3"/>`});
  /* ---- BRK FAN ---- */
  s+=t(255,32,'BRK FAN',13);s+=btn(228,42,56,52,'fan','x',`${t(256,86,'ON',12,LV.fan?B:'#55606c')}`);
  /* ---- AUTO BRK ---- */
  s+=t(110,124,'AUTO BRK',15);
  [['LO',20],['MED',85],['MAX',150]].forEach(([m,x])=>{const on=LV.abrk===m;
    s+=t(x+28,146,m,12)+btn(x,152,56,52,'abrk',m,`${t(x+28,172,'DECEL',10,on&&LV.decel?G:'#3d4650')}${t(x+28,196,'ON',12,on?B:'#3d4650')}`)});
  /* ---- A/SKID & N/W STRG ---- */
  s+=t(256,124,'A/SKID &',11)+t(256,138,'N/W STRG',11);
  s+=`<g class="lvk" data-lv="askid" data-v="x" style="cursor:pointer"><circle cx="256" cy="180" r="22" fill="${dk}" stroke="#7d8a99" stroke-width="2"/><rect x="250" y="${LV.askid?152:180}" width="12" height="28" rx="4" fill="#cfd6de"/></g>`;
  s+=t(292,162,'ON',11,LV.askid?ln:'#9aa6b3','start')+t(292,212,'OFF',11,!LV.askid?ln:'#9aa6b3','start');
  /* ---- landing gear lever ---- */
  const up=LV.gear==='UP';
  s+=`<rect x="330" y="10" width="110" height="230" rx="8" fill="#53627a" stroke="#8796a7"/>`+t(385,32,'UP',13)+t(385,232,'DOWN',13);
  s+=`<path d="M372 46 L385 36 L398 46 M385 36 L385 70" stroke="${ln}" stroke-width="3" fill="none"/><path d="M372 204 L385 214 L398 204 M385 180 L385 214" stroke="${ln}" stroke-width="3" fill="none"/>`;
  s+=`<rect x="378" y="74" width="14" height="104" rx="5" fill="#0d1014"/>`;
  s+=`<g class="lvk" data-lv="gear" data-v="${up?'DOWN':'UP'}" style="cursor:pointer"><rect x="356" y="${up?62:140}" width="58" height="46" rx="10" fill="#22272e" stroke="#8a96a4" stroke-width="2"/>`+
     [0,1,2,3,4].map(i=>`<line x1="360" x2="410" y1="${(up?66:144)+i*9}" y2="${(up?66:144)+i*9}" stroke="#454d57" stroke-width="2"/>`).join('')+`</g>`;
  s+=btn(450,60,140,48,'gear','UP',t(520,90,'GEAR UP',15,up?G:ln))+btn(450,140,140,48,'gear','DOWN',t(520,170,'GEAR DOWN',15,!up?G:ln));
  /* ---- thrust levers ---- */
  s+=`<rect x="10" y="248" width="380" height="276" rx="8" fill="#3d4654" stroke="#8796a7"/>`+t(200,266,'THRUST LEVERS',14);
  const y0=THR_POS.find(p=>p[0]===LV.thr)[2];
  s+=`<rect x="40" y="274" width="150" height="244" rx="6" fill="#2b313a"/>`;
  THR_POS.forEach(([k,l,y])=>{const yy=y;s+=`<line x1="44" x2="186" y1="${yy}" y2="${yy}" stroke="${k.startsWith('REV')?'#ff8a3d':'#9aa6b3'}" stroke-dasharray="${k==='N50'?'4 4':''}"/>`});
  [70,124].forEach(x=>{s+=`<rect x="${x}" y="${y0-12}" width="38" height="24" rx="4" fill="#15191e" stroke="#c9d1da" stroke-width="2"/>`});
  THR_POS.forEach(([k,l,y])=>{const yy=y,on=LV.thr===k;s+=btn(202,yy-15,176,30,'thr',k,t(290,yy+6,l,14,on?G:(k.startsWith('REV')?'#ff9a55':ln)))});
  /* ---- flaps lever ---- */
  s+=`<rect x="400" y="248" width="190" height="276" rx="8" fill="#53627a" stroke="#8796a7"/>`;
  const FP=[['0',296],['1',350],['2',404],['3',458],['FULL',508]];
  s+=`<rect x="440" y="290" width="14" height="224" rx="5" fill="#0d1014"/>`;
  FP.forEach(([l,y],i)=>{const on=LV.flaps===i;s+=`<line x1="456" x2="470" y1="${y}" y2="${y}" stroke="#ffb547" stroke-width="2"/>`+btn(478,y-15,100,30,'flaps',i,t(528,y+6,l,15,on?G:ln))});
  const fy=FP[LV.flaps][1];s+=`<rect x="420" y="${fy-16}" width="54" height="32" rx="7" fill="#1c2026" stroke="#8a96a4" stroke-width="2"/>`;
  const cf=flying()?FL.conf:['0','1+F','2','3','FULL'][LV.flaps];s+=t(450,268,'FLAPS',14,ln,'start')+t(580,268,cf==='0'?'CLEAN':cf,12,'#ffd9a0','end');
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
