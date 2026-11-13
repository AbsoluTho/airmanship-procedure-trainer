'use strict';
/* Shared helpers and image paths. */
const IMG={cockpit:'img/cockpit.webp',elec:'img/ovhd_elec.webp',apu:'img/ovhd_apu.webp',mcdu:'img/mcdu_face.webp'};
const $=(s,r)=>(r||document).querySelector(s);

/* ================= geo ================= */
const D2R=Math.PI/180;
function gc(a,b){const[l1,o1]=[a[0]*D2R,a[1]*D2R],[l2,o2]=[b[0]*D2R,b[1]*D2R];
  const h=Math.sin((l2-l1)/2)**2+Math.cos(l1)*Math.cos(l2)*Math.sin((o2-o1)/2)**2;return 2*Math.asin(Math.sqrt(h))/D2R*60}
function fmtLL(p){const f=(v,w,pos,neg)=>{const a=Math.abs(v),d=Math.floor(a),m=(a-d)*60;return String(d).padStart(w,'0')+'°'+m.toFixed(1).padStart(4,'0')+(v>=0?pos:neg)};
  return f(p[0],2,'N','S')+'/'+f(p[1],3,'E','W')}

