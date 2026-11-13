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

function brg(a,b){const[l1,o1]=[a[0]*D2R,a[1]*D2R],[l2,o2]=[b[0]*D2R,b[1]*D2R];
  return(Math.atan2(Math.sin(o2-o1)*Math.cos(l2),Math.cos(l1)*Math.sin(l2)-Math.sin(l1)*Math.cos(l2)*Math.cos(o2-o1))/D2R+360)%360}
function dst(p,b,d){const l1=p[0]*D2R,o1=p[1]*D2R,t=b*D2R,r=d/60*D2R;
  const l2=Math.asin(Math.sin(l1)*Math.cos(r)+Math.cos(l1)*Math.sin(r)*Math.cos(t));
  return[l2/D2R,(o1+Math.atan2(Math.sin(t)*Math.sin(r)*Math.cos(l1),Math.cos(r)-Math.sin(l1)*Math.sin(l2)))/D2R]}
const hhmm=m=>{m=Math.max(0,Math.round(m));return String(Math.floor(m/60)).padStart(2,'0')+String(m%60).padStart(2,'0')};
const f1=v=>v==null?'--.-':(Math.round(v*10)/10).toFixed(1);
const flying=()=>typeof FL!=='undefined'&&FL.active;
