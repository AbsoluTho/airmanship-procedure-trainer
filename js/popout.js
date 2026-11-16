'use strict';
/* ================= Pop-out windows =================
   A panel (PFD, ND) can be moved to a browser window of its own, to be dragged to another monitor or a television and resized freely.
   The panel itself is moved (its canvas, overlays and listeners), not copied: the page keeps running the flight and draws into it where
   it now is, at the size and pixel density of that window. Closing the window, or DOCK, puts the panel back in the page.
   The size and place of each window are remembered (localStorage) and used the next time it is popped out. PC browsers only. */
const POP={wins:{},KEY:'airmanship.pop.v1',
  panels:{
    /* ar: width / height of the panel with its frame; bare: of the screen alone (FRAME OFF: the display fills the window) */
    pfd:{title:'PFD',el:()=>pfdC&&pfdC.parentElement,ar:452/559,bare:395/416,fit:()=>pfdFit(),w:520,h:650},
    nd:{title:'ND',el:()=>ndC&&ndC.parentElement,ar:452/559,bare:395/416,fit:()=>ndFit(),w:520,h:650}}};
function popGeo(){try{return JSON.parse(localStorage.getItem(POP.KEY))||{}}catch(e){return{}}}
function popSave(id,w){try{if(!w||w.closed||!w.innerWidth)return;const g=popGeo(),r=POP.wins[id];g[id]={x:w.screenX,y:w.screenY,w:w.innerWidth,h:w.innerHeight,bare:r?!!r.bare:!!(g[id]&&g[id].bare)};localStorage.setItem(POP.KEY,JSON.stringify(g))}catch(e){}}
function popCan(){return!(navigator.maxTouchPoints>0&&!matchMedia('(any-pointer:fine)').matches)}   /* not on a phone or tablet */
function popOut(id){const P=POP.panels[id];if(!P||POP.wins[id])return false;const el=P.el();if(!el)return false;
  const g=popGeo()[id]||{},feat=`popup=yes,width=${g.w||P.w},height=${g.h||P.h}`+(g.x!=null?`,left=${g.x},top=${g.y}`:'');
  let w=null;try{w=window.open('','airmanship-'+id,feat)}catch(e){w=null}
  if(!w){if(typeof askConfirm==='function')askConfirm('Pop-up windows are blocked','Allow pop-ups for this site in the browser, then press POP OUT again. Separate windows work on the live site on a PC, not inside the test page.','OK',()=>{});return false}
  const d=w.document;d.open();d.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+P.title+' · Airmanship Procedure Trainer</title></head><body class="pop-body"><div class="pop-host" id="popHost"></div></body></html>');d.close();
  {const b=d.createElement('base');b.href=document.baseURI;d.head.appendChild(b)}
  document.querySelectorAll('link[rel="stylesheet"],style').forEach(n=>d.head.appendChild(d.importNode(n,true)));
  /* the place the panel leaves in the page */
  const ph=document.createElement('div');ph.className=el.className+' pop-ph';ph.innerHTML=`<div class="pop-ph-in"><b>${P.title}</b><span>in its own window</span><button type="button" class="fb" data-pop-dock="${id}">DOCK</button></div>`;
  el.parentNode.insertBefore(ph,el);d.getElementById('popHost').appendChild(el);POPDOCS.push(d);
  const btn=el.querySelector('.pop-btn');if(btn){btn.textContent='DOCK';btn.title='Put the '+P.title+' back in the page'}
  const rec={w,d,el,ph,fit:null,t:null,bare:!!g.bare&&!!P.bare};POP.wins[id]=rec;
  const fit=()=>{if(w.closed)return;const W=w.innerWidth,H=w.innerHeight,ar=rec.bare?P.bare:P.ar;el.classList.toggle('pop-bare',rec.bare);el.style.aspectRatio=rec.bare?String(ar):'';
    el.style.width=Math.max(120,Math.floor(Math.min(W,H*ar)))+'px';el.style.flex='none';P.fit()};rec.fit=fit;
  /* FRAME: the panel with its cockpit frame, or the display alone filling the window */
  if(P.bare){const fb=d.createElement('button');fb.type='button';fb.className='pop-btn pop-frame';const lab=()=>{fb.textContent=rec.bare?'FRAME ON':'FRAME OFF'};lab();
    fb.addEventListener('click',()=>{rec.bare=!rec.bare;lab();fit();popSave(id,w)});el.appendChild(fb);rec.fb=fb}
  w.addEventListener('resize',()=>{fit();popSave(id,w)});
  try{new w.ResizeObserver(()=>P.fit()).observe(el)}catch(e){}
  w.addEventListener('pagehide',()=>popDock(id,true));
  /* this window's animation frames also advance the flight and keep its panel drawn */
  (function loop(){if(w.closed||POP.wins[id]!==rec)return;try{flightPump()}catch(e){}w.requestAnimationFrame(loop)})();
  rec.t=setInterval(()=>{if(w.closed)popDock(id,true);else popSave(id,w)},1000);
  setTimeout(fit,0);setTimeout(fit,250);return true}
function popDock(id,closing){const rec=POP.wins[id];if(!rec)return;delete POP.wins[id];clearInterval(rec.t);const P=POP.panels[id];
  if(!closing)popSave(id,rec.w);const i=POPDOCS.indexOf(rec.d);if(i>=0)POPDOCS.splice(i,1);
  rec.el.style.width='';rec.el.style.flex='';rec.el.style.aspectRatio='';rec.el.classList.remove('pop-bare');if(rec.fb)rec.fb.remove();if(rec.ph.parentNode)rec.ph.parentNode.replaceChild(rec.el,rec.ph);
  const btn=rec.el.querySelector('.pop-btn');if(btn){btn.textContent='POP OUT';btn.title='Open the '+P.title+' in its own window'}
  if(!closing){try{rec.w.close()}catch(e){}}
  P.fit();setTimeout(()=>{P.fit();if(typeof refreshAll==='function')refreshAll()},50)}
/* POP OUT button on each panel (PC only) */
if(popCan())Object.keys(POP.panels).forEach(id=>{const P=POP.panels[id],el=P.el();if(!el)return;
  const b=document.createElement('button');b.type='button';b.className='pop-btn';b.textContent='POP OUT';b.title='Open the '+P.title+' in its own window';
  b.addEventListener('click',()=>{if(POP.wins[id])popDock(id);else popOut(id)});el.appendChild(b)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-pop-dock]');if(b)popDock(b.dataset.popDock)});
addEventListener('pagehide',()=>Object.keys(POP.wins).forEach(id=>{try{POP.wins[id].w.close()}catch(e){}}));
window.__pop={POP,out:popOut,dock:popDock};
