'use strict';
/* ================= Engine start (A320 automatic start, simplified) =================
   ENG MODE selector CRANK / NORM / IGN START and the ENG MASTER levers. On the ground, MODE IGN START then MASTER ON:
   start valve opens, N2 rises; ignition at 16 % N2 (fuel flow, EGT rises to its start peak, N1 follows); start valve
   closes at 50 % N2; the engine stabilizes at idle (N1 19.6, N2 58.9, EGT 395, FF 290) in about 45 s. MASTER ON with
   MODE NORM does not start the engine. MASTER OFF shuts the engine down (N2 and N1 run down, fuel off, EGT cools).
   START FLIGHT starts both engines at once if they are not running; in flight the masters stay ON. */
const ENG={mode:'NORM',e:[null,null],last:null};
const IDLE_E={n1:19.6,n2:58.9,egt:395,ff:290};
function engInit(i,run){const amb=Math.round(typeof satC==='function'?satC():25);ENG.e[i]=run?Object.assign({st:'run'},IDLE_E):{st:'off',n1:0,n2:0,egt:amb,ff:0}}
engInit(0,false);engInit(1,false);
const engRun=i=>ENG.e[i].st==='run';
function engTick(dt){const amb=typeof satC==='function'?satC():25;let busy=false;
  ENG.e.forEach((e,i)=>{const m=LV['m'+(i+1)];
    if(m&&e.st==='off'&&ENG.mode==='IGN'&&!flying())e.st='start';
    if(!m&&(e.st==='run'||e.st==='start'))e.st='stop';
    if(e.st==='start'){const r=e.n2<16?1.6:e.n2<50?1.4:0.6;e.n2=Math.min(IDLE_E.n2,e.n2+r*dt);
      const lit=e.n2>=16;e.ff=lit?Math.min(IDLE_E.ff,250+(e.n2-16)):0;
      e.n1=lit?Math.pow(Math.max(0,(e.n2-16)/(IDLE_E.n2-16)),1.3)*IDLE_E.n1:e.n2*0.05;
      const tg=!lit?amb:e.n2<40?640:IDLE_E.egt+(IDLE_E.n2-e.n2)*12;e.egt+=Math.max(-25*dt,Math.min(25*dt,tg-e.egt));
      if(e.n2>=IDLE_E.n2-0.05&&Math.abs(e.egt-IDLE_E.egt)<3){Object.assign(e,IDLE_E);e.st='run'}busy=true}
    else if(e.st==='stop'){e.ff=0;e.n2=Math.max(0,e.n2-1.5*dt);e.n1=Math.max(0,e.n1-0.8*dt);e.egt=Math.max(amb,e.egt-8*dt);
      if(e.n2<=0&&e.n1<=0&&e.egt<=amb+0.5){engInit(i,false)}busy=true}});
  return busy}
/* ECAM values: on the ground before the flight, from the start model */
{const es0=engStep;engStep=function(){if(flying())return es0();const amb=typeof satC==='function'?satC():25;
  return ENG.e.map((e,i)=>({n1:e.n1+(engRun(i)&&i?0.2:0),n2:e.n2+(engRun(i)&&i?0.3:0),egt:Math.round(e.egt)+(engRun(i)&&i?6:0),ff:e.ff,fail:e.st!=='run',off:e.st==='off'}))}}
/* the flight starts with both engines running; after RESET the engines keep running */
{const fs0=flightStart;flightStart=function(){const r=fs0();if(!r.length){engInit(0,true);engInit(1,true);LV.m1=LV.m2=true}return r}}
function engMode(v){if(!['CRANK','NORM','IGN'].includes(v))return;ENG.mode=v;if(typeof refreshAll==='function')refreshAll()}
/* ground timing: real time while a start or a shutdown is in progress */
setInterval(()=>{const t=performance.now()/1000,dt=ENG.last==null?0:Math.min(0.5,t-ENG.last);ENG.last=t;
  if(flying())return;if(engTick(dt*(FL.rate||1))&&window.drawEcam)drawEcam()},100);
window.__eng={ENG,tick:engTick,mode:engMode,init:engInit};
