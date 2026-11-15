'use strict';
/* FLIGHT PLANS tab: the OFPs of the training flights (js/data/ofp.js). A list of flights by ORIGIN - DESTINATION; a flight shows
   what goes on INIT A and INIT B, the route to the destination and to the alternates, and the winds flown by the simulator. */
const OV={flt:null,shut:{}};
try{OV.shut=JSON.parse(localStorage.getItem('airmanship.ofp.sections')||'{}')||{}}catch(e){}
/* a section of a flight: the + / - button beside its title shows or hides it; the choice is kept for every flight */
function ofpSec(key,title,body,wide){const shut=!!OV.shut[key];return'<div class="card sec'+(wide?' wide':'')+(shut?' shut':'')+'" data-sec="'+key+'"><h2><button type="button" class="sec-t" data-ofp-sec="'+key+'" aria-expanded="'+!shut+'" aria-label="'+(shut?'Show ':'Hide ')+title+'">'+(shut?'+':'−')+'</button><span data-ofp-sec="'+key+'">'+title+'</span></h2><div class="sec-b">'+body+'</div></div>'}
const t1=kg=>(kg/1000).toFixed(1),hhmmO=m=>String(Math.floor(m/60)).padStart(2,'0')+String(m%60).padStart(2,'0'),w3=w=>w?String(w[0]).padStart(3,'0')+'/'+String(w[1]).padStart(3,'0'):'',
  escH=x=>String(x==null?'':x).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function ofpRte(o){const a=typeof AOC_OFP!=='undefined'&&AOC_OFP[o.flt],name=a&&a.rte,r=name&&CO_RTES[name];return r?{name,r}:null}
function ofpLogTable(log,withFl){return'<div class="otw"><table class="ot"><thead><tr><th>AWY</th><th>WPT</th><th>TRK</th><th>NM</th>'+(withFl?'<th>FL</th>':'')+'<th>WIND</th></tr></thead><tbody>'+
  log.map(r=>'<tr'+(r.id[0]==='-'?' class="ps"':'')+'><td>'+escH(r.awy)+'</td><td><b>'+escH(r.id)+'</b></td><td>'+String(r.mt).padStart(3,'0')+'</td><td>'+r.dst+'</td>'+(withFl?'<td>'+escH(r.fl)+'</td>':'')+'<td>'+w3(r.wind)+'</td></tr>').join('')+'</tbody></table></div>'}
function ofpList(){return'<div class="ofp-head"><h2>Flight plans</h2><p>Choose a flight. Each one is an OFP with its route, alternates, INIT data and winds.</p></div><div class="ofp-list">'+
  OFPS.map(o=>'<button type="button" class="ofp-item" data-ofp="'+o.flt+'"><span class="od">'+o.from+' - '+o.to+'</span><span class="meta">'+o.flt+' · FL'+o.fl+' · '+o.dist.ground+' NM · ALTN '+o.altn.map(a=>a.id).join(', ')+'</span></button>').join('')+'</div>'}
function ofpDetail(o){const R=ofpRte(o),r=R&&R.r,f=o.fuel,m=o.mass,temp=Math.round(15-2*o.fl/10+o.isa),wc=o.wc.match(/(\d+) KTS (\w+)/),tw=(wc[2]==='HEAD'?'HD':'TL')+String(wc[1]).padStart(3,'0');
  const kv=(k,v,n)=>'<li><span>'+k+'</span><b>'+v+'</b>'+(n?'<i>'+n+'</i>':'')+'</li>',flown=typeof wxOfp==='function'&&S.active&&wxOfp()===o&&WX.on;
  const mcduAlt=r&&r.altn,w=o.wind,tb=(T)=>'<table class="ot"><thead><tr>'+T.map(x=>'<th>FL'+x[0]+'</th>').join('')+'</tr></thead><tbody><tr>'+T.map(x=>'<td>'+w3(x.slice(1))+'</td>').join('')+'</tr></tbody></table>';
  const lvl=w.enr.length?'<details><summary>Winds at every waypoint and level</summary><div class="otw"><table class="ot"><tbody>'+w.enr.map(e=>'<tr><td><b>'+escH(e.id)+'</b></td>'+e.lv.map(l=>'<td>FL'+l[0]+' '+w3(l.slice(1))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>':'';
  return'<div class="ofp-head"><button type="button" class="btn sm" data-ofp-back>← Flights</button><h2>'+o.from+' - '+o.to+'</h2><p>'+o.flt+' · '+o.date+' · STD '+o.std+'Z · ETA '+o.eta+'Z · '+o.pax+' pax</p><span class="sec-all"><button type="button" class="btn sm" data-ofp-all="open">+ All</button><button type="button" class="btn sm" data-ofp-all="shut">− All</button></span></div>'+
  '<div class="ofp-grid">'+
  ofpSec('inita','INIT A','<ul class="okv">'+
    kv('CO RTE',R?R.name:'none','or FROM/TO '+o.from+'/'+o.to)+kv('ALTN',mcduAlt||o.altn[0].id,o.altn.length>1?'OFP alternates: '+o.altn.map(a=>a.id).join(', '):'')+kv('FLT NBR',o.flt)+
    kv('COST INDEX',o.ci)+kv('CRZ FL/TEMP','FL'+o.fl+' / '+temp,'ISA '+(o.isa>=0?'+':'')+o.isa)+kv('TROPO','36090','default')+
  '</ul><div class="note"><span class="tag">TIP</span><span>Enter the flight number, then INIT REQUEST: the uplink fills INIT A and the F-PLN, with the route to '+(mcduAlt||o.altn[0].id)+' as the ALTN F-PLN.</span></div>')+
  ofpSec('initb','INIT B','<ul class="okv">'+
    kv('TAXI',t1(f.taxi),f.taxi+' kg')+kv('ZFW/ZFWCG',t1(m.zfm)+' / CG','ZFW '+m.zfm+' kg; the CG is on the loadsheet, not on the OFP')+kv('BLOCK',t1(f.block.fuel),f.block.fuel+' kg')+
    kv('RTE RSV',t1(f.cont.fuel),'contingency '+f.cont.fuel+' kg')+kv('ALTN',t1(f.altn.fuel),'to '+f.altnId+', '+f.altn.fuel+' kg')+kv('FINAL/TIME',t1(f.final.fuel)+' / '+hhmmO(f.final.time),f.final.fuel+' kg')+
    kv('TRIP WIND',tw,'average '+o.wc.toLowerCase())+
  '</ul><h3>OFP figures to cross-check</h3><ul class="okv">'+
    kv('TRIP/TIME',t1(f.trip.fuel)+' / '+hhmmO(f.trip.time),f.trip.fuel+' kg')+kv('TOW',t1(m.tom),m.tom+' kg')+kv('LW',t1(m.ldm),m.ldm+' kg')+kv('EXTRA/TIME',t1(f.extra.fuel)+' / '+hhmmO(f.extra.time),f.extra.fuel+' kg')+kv('MIN T/O FUEL',t1(f.minTof.fuel),f.minTof.fuel+' kg')+
  '</ul>')+
  ofpSec('route','Route to '+o.to,'<ul class="okv">'+
    kv('ROUTE',escH(o.route))+(r?kv('DEPARTURE','RWY '+r.rwy+(r.sid?' · '+r.sid:' · no SID on the OFP'),o.proc.sid?'':'runway chosen for the company route')+kv('ARRIVAL',(r.star?r.star+' · ':'')+r.appr+(r.via?' via '+r.via:''),'OFP: '+[o.proc.star,o.proc.appr].filter(Boolean).join(' '))
      :kv('SID / STAR / APPR',[o.proc.sid,o.proc.star,o.proc.appr].filter(Boolean).join(' · ')))+
    kv('DISTANCE',o.dist.ground+' NM','air '+o.dist.air+' NM · great circle '+o.dist.gc+' NM')+kv('CLIMB',escH(o.climb))+kv('DESCENT',escH(o.descent))+
  '</ul>'+ofpLogTable(o.log,true),true)+
  o.altn.map((a,n)=>ofpSec('alt'+n,'Route to alternate '+a.id,'<ul class="okv">'+kv('ROUTE',escH(a.route))+kv('LEVEL',a.fl?'FL'+a.fl:'')+kv('DISTANCE',a.dist+' NM')+kv('FUEL',a.fuel?t1(a.fuel):'',a.fuel?a.fuel+' kg':'')+
    kv('MCDU',a.id===mcduAlt?'ALTN F-PLN of the company route':'enter on the ALTN F-PLN','after END OF F-PLN: type each waypoint on the line, or open ALTN AIRWAYS with the line key')+'</ul>'+ofpLogTable(a.log,true),true)).join('')+
  ofpSec('winds','Winds','<ul class="okv">'+kv('SIMULATOR',flown?'flying these winds':WX.on?'flown when this city pair is the active F-PLN':'OFP winds off','<button type="button" class="btn sm" data-ofp-wx>'+(WX.on?'Turn the OFP winds off':'Turn the OFP winds on')+'</button>')+
    kv('MCDU','WIND REQUEST','CLIMB, CRUISE and DESCENT WIND pages: the uplink fills the forecast from this OFP')+'</ul>'+
    '<h3>Climb</h3><div class="otw">'+tb(w.clb)+'</div><h3>Descent</h3><div class="otw">'+tb(w.des)+'</div>'+lvl+
    '<div class="note"><span class="tag">NOTE</span><span>True direction / knots. The cruise wind at each waypoint is in the route table above. Below 1500 ft above the airfield the wind fades to calm on the runway.</span></div>',true)+
  '</div>'}
function ofpRender(){const el=$('#ofpView');if(!el||typeof OFPS==='undefined')return;const o=OV.flt&&ofpOf(OV.flt);el.innerHTML=o?ofpDetail(o):ofpList()}
function ofpKeep(){try{localStorage.setItem('airmanship.ofp.sections',JSON.stringify(OV.shut))}catch(e){}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ofp],[data-ofp-back],[data-ofp-wx],[data-ofp-sec],[data-ofp-all]');if(!b)return;
  if(b.dataset.ofpSec){const k=b.dataset.ofpSec,c=b.closest('.sec'),shut=!OV.shut[k];if(shut)OV.shut[k]=1;else delete OV.shut[k];ofpKeep();   /* no redraw: the page keeps its scroll position */
    c.classList.toggle('shut',shut);const t=c.querySelector('.sec-t');t.textContent=shut?'+':'−';t.setAttribute('aria-expanded',String(!shut));return}
  if(b.dataset.ofpAll){OV.shut={};if(b.dataset.ofpAll==='shut')document.querySelectorAll('#ofpView .sec').forEach(c=>{OV.shut[c.dataset.sec]=1});ofpKeep();
    const y=scrollY;ofpRender();scrollTo(0,y);return}
  if(b.dataset.ofp){OV.flt=b.dataset.ofp;WX.flt=OV.flt}else if('ofpBack'in b.dataset)OV.flt=null;else{WX.on=!WX.on}ofpRender()});
window.__ofp={OV,render:ofpRender};
