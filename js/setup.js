'use strict';
/* ================= flight setup: save and load =================
   SAVE SETUP (enabled once START FLIGHT is possible) keeps the MCDU data (INIT A/B, F-PLN, SEC F-PLN,
   PERF, RAD NAV, winds...), the FCU and the EFIS settings in this browser (localStorage), so that a
   later session can go straight to the takeoff: LOAD SETUP puts everything back, ready for START. */
const SETUP_KEY='airmanship.setup.v1';
const SETUP_SKIP_S=['req','rsel','nw','delAll','page','title','sp','msg','msgs','tmpy','dirTo','hold','phase','apprArm','secMode','msgOff'];
const SETUP_SKIP_FCU=['ap1','ap2','athr','exped','hdgPre','hdgPreT','spdPre','spdPreT','vsPre','vsPreT'];
function setupRead(){try{const t=localStorage.getItem(SETUP_KEY);return t?JSON.parse(t):null}catch(e){return null}}
function setupSave(){if(flying()||flightReady().length)return false;
  const s={};for(const[k,v]of Object.entries(S))if(!SETUP_SKIP_S.includes(k))s[k]=v;
  const f={};for(const[k,v]of Object.entries(FCU))if(!SETUP_SKIP_FCU.includes(k))f[k]=v;
  const e=Object.assign({},EFIS);delete e.ctr;
  const a=S.active,d={v:1,t:Date.now(),label:(I().from||'----')+'/'+(I().to||'----')+(a&&a.rwy?' '+a.rwy:'')+(a&&a.sid?' '+a.sid:''),S:clone(s),FCU:clone(f),EFIS:clone(e),LV:{flaps:LV.flaps,abrk:LV.abrk,fan:LV.fan,askid:LV.askid}};
  try{localStorage.setItem(SETUP_KEY,JSON.stringify(d));return true}catch(err){S.msg='SETUP NOT SAVED';return false}}
function setupLoad(){const d=setupRead();if(!d)return false;if(FL.active)flightReset();
  const el=S.elec;S=Object.assign(freshState(),clone(d.S));S.elec=el;S.page='FPLN';S.fpOff=0;S.msgs=[];S.msgOff={};
  if(typeof ALIGN_S!=='undefined')S.irsT0=Date.now()-ALIGN_S*1000;   /* IRS already aligned */
  Object.assign(FCU,d.FCU,{ap1:false,ap2:false,athr:false,exped:false});Object.assign(EFIS,d.EFIS,{ctr:null});if(d.LV)Object.assign(LV,d.LV,{thr:'IDLE',gear:'DOWN'});
  refreshAll();if(typeof fcuRefresh==='function')fcuRefresh();return true}
const hhmmLocal=t=>{const x=new Date(t);return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')};
{const ui0=flightUI;flightUI=function(){ui0();const host=$('#flight');if(!host)return;const d=setupRead(),sv=host.querySelector('[data-fl="setup:save"]'),ld=host.querySelector('[data-fl="setup:load"]'),info=$('#flSetup');
  if(sv)sv.disabled=flying()||flightReady().length>0;if(ld)ld.disabled=!d;if(info)info.textContent=d?d.label+' · saved '+hhmmLocal(d.t):'nothing saved'}}
{const b0=flightBtn;flightBtn=function(k){if(k==='setup:save'){setupSave();return refreshAll()}if(k==='setup:load'){setupLoad();return}return b0(k)}}
window.__setup={save:setupSave,load:setupLoad,read:setupRead};
