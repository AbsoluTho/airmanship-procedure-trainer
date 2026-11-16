'use strict';
/* ================= Pop-out windows =================
   The MCDU, the levers and the landing gear panel can each be moved to a browser window of its own, to be dragged to another monitor
   and resized freely; the displays stay together in the page, which is then the displays window (for a television, say).
   The panel itself is moved (its canvas, overlays and listeners), not copied: the page keeps running the flight and draws into it where
   it now is, at the size and pixel density of that window. Closing the window, or its dock button, puts the panel back in the page.
   The window keeps the shape of the panel, so the panel always fills it. The size and place of each window are remembered (localStorage)
   and used the next time it is popped out. PC browsers only. */
/* a canvas takes the size and pixel density of the window it is in; true when it changed */
function cvFit(c){if(!c)return false;const v=c.ownerDocument.defaultView||window,d=v.devicePixelRatio||1,w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);
  if(w&&h&&(w!==c.width||h!==c.height)){c.width=w;c.height=h;return true}return false}
const POP={wins:{},KEY:'airmanship.pop.v1',
  /* ar: width / height of the panel; bare: of the screen alone (FRAME OFF: the display fills the window);
     btn: where the pop-out button goes in the page (default: on the panel); overlay: the panel lies over another one and leaves no gap */
  panels:{
    /* The displays stay together in the page (EFIS control panel, FCU, PFD, ND, upper and lower ECAM): that is the one displays window.
       The MCDU, the levers and the landing gear panel each open in a window of their own. With the MCDU out, the page shows the ECAM in its place. */
    mcdu:{title:'MCDU',el:()=>$('#mcdu'),ar:563/880,fit:()=>{const mc=$('#mcdu'),sc=$('#scr');if(!mc||!sc||!sc.clientHeight)return;
        const h=sc.clientHeight/14,w=sc.clientWidth/24,fl=Math.min(h*0.98,w/0.6*0.98);mc.style.setProperty('--fl',fl+'px');mc.style.setProperty('--fs',fl*0.74+'px')},w:480,h:750,
      out:()=>{POP.ecam0=EC.on;if(!EC.on)ecamShow(true)},dock:()=>{if(POP.ecam0===false)ecamShow(false);POP.ecam0=null}},
    levers:{title:'Levers',el:()=>$('#lvPanel'),ar:600/530,overlay:true,btn:()=>$('.lv-btns'),after:'#lvBtn',fit:()=>{drawLevers()},w:680,h:601},
    gear:{title:'Landing gear',el:()=>$('#lgPanel'),ar:650/333,overlay:true,btn:()=>$('.lv-btns'),after:'#lgBtn',fit:()=>{drawGear()},w:650,h:333}}};
/* icons: a square with an arrow leaving it (open in a window), a square with an arrow entering it (back in the page) */
const POP_ICO={out:'<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M12.5 9.5V14H2V3.5h4.5M9.5 2H14v4.5M14 2L7.5 8.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  in:'<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M12.5 9.5V14H2V3.5h4.5M12.5 8H8V3.5M8 8l6-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
function popGeo(){try{return JSON.parse(localStorage.getItem(POP.KEY))||{}}catch(e){return{}}}
function popSave(id,w){try{if(!w||w.closed||!w.innerWidth)return;const g=popGeo(),r=POP.wins[id];g[id]={x:w.screenX,y:w.screenY,w:w.innerWidth,h:w.innerHeight,bare:r?!!r.bare:!!(g[id]&&g[id].bare)};localStorage.setItem(POP.KEY,JSON.stringify(g))}catch(e){}}
function popCan(){return!(navigator.maxTouchPoints>0&&!matchMedia('(any-pointer:fine)').matches)}   /* not on a phone or tablet */
function popRedraw(){if(typeof refreshAll==='function')refreshAll();if(typeof drawLevers==='function'){drawLevers();drawGear()}}
function popOut(id,view){const P=POP.panels[id];if(!P||POP.wins[id])return false;const el=P.el();if(!el)return false;
  const g=popGeo()[id]||{},feat=`popup=yes,width=${g.w||P.w},height=${g.h||P.h}`+(g.x!=null?`,left=${g.x},top=${g.y}`:'');
  let w=null;try{w=(view||window).open('','airmanship-'+id,feat)}catch(e){w=null}   /* opened from the window that was clicked */
  if(!w){if(typeof askConfirm==='function')askConfirm('Pop-up windows are blocked','Allow pop-ups for this site in the browser, then try again.','OK',()=>{});return false}
  const d=w.document;d.open();d.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+P.title+' · Airmanship Procedure Trainer</title></head><body class="pop-body"><div class="pop-host" id="popHost"></div></body></html>');d.close();
  {const b=d.createElement('base');b.href=document.baseURI;d.head.appendChild(b)}
  document.querySelectorAll('link[rel="stylesheet"],style').forEach(n=>d.head.appendChild(d.importNode(n,true)));
  d.documentElement.style.cssText=document.documentElement.style.cssText;   /* the page's layout variables */
  /* the place the panel leaves in the page: a framed note with DOCK, or nothing for a panel that lies over another one */
  const ph=P.overlay?document.createComment('pop '+id):document.createElement('div');
  if(!P.overlay){ph.className=el.className+' pop-ph';ph.innerHTML=`<div class="pop-ph-in"><b>${P.title}</b><span>in its own window</span><button type="button" class="fb" data-pop-dock="${id}">DOCK</button></div>`}
  const host=d.getElementById('popHost');el.parentNode.insertBefore(ph,el);host.appendChild(el);POPDOCS.push(d);
  const rec={w,d,el,ph,fit:null,t:null,bare:!!g.bare&&!!P.bare};POP.wins[id]=rec;el.hidden=false;
  const arNow=()=>rec.bare?P.bare:P.ar;
  const fit=()=>{if(w.closed)return;const W=w.innerWidth,H=w.innerHeight,ar=arNow();el.classList.toggle('pop-bare',rec.bare);el.classList.add('pop-in');el.style.aspectRatio=String(ar);
    el.style.width=Math.max(80,Math.floor(Math.min(W,H*ar)))+'px';el.style.flex='none';P.fit()};rec.fit=fit;
  /* buttons of the window: back to the page (top left), frame on / off for the displays (top right) */
  const dk=d.createElement('button');dk.type='button';dk.className='pop-btn pop-dock';dk.innerHTML=POP_ICO.in;dk.title='Put the '+P.title+' back in the page';dk.setAttribute('aria-label',dk.title);
  dk.addEventListener('click',()=>popDock(id));host.appendChild(dk);
  /* the window follows the shape of the panel, so the panel always fills it: after a resize the other side of the window is adjusted
     (the side that was dragged is kept); if the browser will not go as narrow or as low as asked, the other side is fitted to what it allows.
     A maximised or full-screen window cannot be reshaped: the panel is then centred. */
  const reshape=(iw,ih)=>{rec.auto=Date.now();try{w.resizeTo(Math.round(iw+(w.outerWidth-w.innerWidth)),Math.round(ih+(w.outerHeight-w.innerHeight)))}catch(e){}};
  const snap=(byHeight)=>{if(w.closed)return;const W=w.innerWidth,H=w.innerHeight,ar=arNow();if(Math.abs(W-H*ar)<=2){rec.lw=W;rec.lh=H;return}
    const keepH=byHeight===true||(byHeight!==false&&Math.abs(H-(rec.lh||H))>=Math.abs(W-(rec.lw||W)));
    const tw=keepH?Math.round(H*ar):W,th=keepH?H:Math.round(W/ar);reshape(tw,th);
    setTimeout(()=>{if(w.closed)return;const W2=w.innerWidth,H2=w.innerHeight;      /* a limit of the browser: fit the other side to the size it gave */
      if(W2>tw+2)reshape(W2,Math.round(W2/ar));else if(H2>th+2)reshape(Math.round(H2*ar),H2);
      setTimeout(()=>{if(!w.closed){rec.lw=w.innerWidth;rec.lh=w.innerHeight;fit();popSave(id,w)}},200)},200)};
  if(P.bare){const fb=d.createElement('button');fb.type='button';fb.className='pop-btn pop-frame';const lab=()=>{fb.textContent=rec.bare?'FRAME ON':'FRAME OFF'};lab();
    fb.addEventListener('click',()=>{rec.bare=!rec.bare;lab();fit();snap(true);popSave(id,w)});host.appendChild(fb)}
  let rz=null;w.addEventListener('resize',()=>{fit();popSave(id,w);if(Date.now()-(rec.auto||0)<450)return;clearTimeout(rz);rz=setTimeout(()=>snap(),180)});
  try{new w.ResizeObserver(()=>P.fit()).observe(el)}catch(e){}
  w.addEventListener('pagehide',()=>popDock(id,true));
  /* the keyboard of this window types on the MCDU as in the page */
  d.addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;document.dispatchEvent(new KeyboardEvent('keydown',{key:e.key,code:e.code,shiftKey:e.shiftKey,bubbles:true,cancelable:true}))});
  /* this window's animation frames also advance the flight and keep its panel drawn */
  (function loop(){if(w.closed||POP.wins[id]!==rec)return;try{flightPump()}catch(e){}w.requestAnimationFrame(loop)})();
  rec.t=setInterval(()=>{if(w.closed)popDock(id,true);else popSave(id,w)},1000);
  if(P.out)P.out();popRedraw();setTimeout(fit,0);setTimeout(()=>{fit();rec.lw=w.innerWidth;rec.lh=w.innerHeight;snap(true)},250);return true}
function popDock(id,closing){const rec=POP.wins[id];if(!rec)return;delete POP.wins[id];clearInterval(rec.t);const P=POP.panels[id];
  if(!closing)popSave(id,rec.w);const i=POPDOCS.indexOf(rec.d);if(i>=0)POPDOCS.splice(i,1);
  if(typeof closeKnob==='function')closeKnob();
  rec.el.style.width='';rec.el.style.flex='';rec.el.style.aspectRatio='';rec.el.classList.remove('pop-bare','pop-in');
  if(rec.ph.parentNode)rec.ph.parentNode.replaceChild(rec.el,rec.ph);
  if(!closing){try{rec.w.close()}catch(e){}}
  if(P.dock)P.dock();P.fit();popRedraw();setTimeout(()=>{P.fit();popRedraw()},50)}
/* pop-out button of each panel (PC only): on the panel, top left; for the levers and the gear panel, beside their LEVERS / LDG GEAR buttons */
if(popCan())Object.keys(POP.panels).forEach(id=>{const P=POP.panels[id],el=P.el();if(!el)return;
  const b=document.createElement('button');b.type='button';b.className='pop-btn pop-main'+(P.btn?' pop-inline':'');b.dataset.pop=id;b.innerHTML=POP_ICO.out;
  b.title='Open the '+P.title+' in its own window';b.setAttribute('aria-label',b.title);
  b.addEventListener('click',e=>{e.stopPropagation();if(POP.wins[id]){try{POP.wins[id].w.focus()}catch(x){}}else popOut(id,e.view)});
  if(P.btn){const h=P.btn(),a=h&&h.querySelector(P.after);if(a)a.insertAdjacentElement('afterend',b);else if(h)h.appendChild(b)}else el.appendChild(b)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-pop-dock]');if(b)popDock(b.dataset.popDock)});
addEventListener('pagehide',()=>Object.keys(POP.wins).forEach(id=>{try{POP.wins[id].w.close()}catch(e){}}));
window.__pop={POP,out:popOut,dock:popDock};
