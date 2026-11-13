'use strict';
/* ================= VNAV: altitude and speed constraints =================
   Managed climb (CLB) levels off at an AT or AT-OR-BELOW constraint (ALT CST* / ALT CST)
   until the waypoint is sequenced, then climbs again. Managed descent (DES) follows a
   3° path built backwards from the runway that meets every arrival constraint and does not
   go below an AT or AT-OR-ABOVE constraint before its waypoint. Speed constraints cap the
   managed speed: in climb up to the waypoint, in descent from the waypoint on (with the
   deceleration started before it). OP CLB, OP DES, V/S and FPA ignore all constraints.
   Simplified for procedure training; not the FMGS vertical guidance. */

/* the lateral path used for distances: the flight path in the air, a cached one on the ground */
let _vnPath={sig:null,P:null};
function vnPath(){if(flying()&&FL.path)return FL.path;const sig=planSig();if(_vnPath.sig!==sig){_vnPath={sig,P:buildPath()}}return _vnPath.P}

/* constrained legs with their along-path position s and distance to the threshold dc */
function cstrList(P){P=P||vnPath();const p=S.active;if(!p||!P)return[];const out=[],seen=new Set();
  for(const pt of P.pts){if(pt.ix==null||seen.has(pt.ix))continue;seen.add(pt.ix);const l=p.legs[pt.ix];if(!l||(!l.alt&&!l.spd)||l.k==='orig'||l.k==='dest')continue;
    out.push({ix:pt.ix,id:l.id,s:pt.s,dc:P.sThr-pt.s,alt:l.alt||null,spd:l.spd||null,ph:legSeg(l)})}
  return out}

/* managed descent path (ft) as a function of the distance to the threshold (NM) */
function baseProfile(dtg){const tdze=destRwy().tdze,Ai=faf(),dgs=(Ai-tdze-50)/318;
  if(dtg<=dgs)return gsAlt(dtg);if(dtg<=dgs+8)return Ai;return Ai+318*(dtg-dgs-8)}
function profileAlt(dtg){let a=baseProfile(dtg);const cs=cstrList().filter(c=>c.ph==='des'&&c.alt);
  for(const c of cs)if(c.alt.t==='-'||c.alt.t==='@')a=Math.min(a,c.alt.v+318*Math.max(0,dtg-c.dc));   /* reach it at the waypoint on a 3° path */
  for(const c of cs)if((c.alt.t==='+'||c.alt.t==='@')&&dtg>=c.dc-0.01)a=Math.max(a,c.alt.v);           /* not below it before the waypoint */
  return a}
/* T/D: where the constrained descent path meets the cruise level */
let _td={k:null,v:0};
function tdDist(){const crz=I().crz*100,P=vnPath(),k=planSig()+'|'+crz+'|'+JSON.stringify(S.active.legs.map(l=>[l.alt,l.spd]))+'|'+(P?P.sThr.toFixed(2):'');
  if(_td.k===k)return _td.v;let d=0;const max=P?P.sThr:400;
  while(d<max&&profileAlt(d)<crz)d+=1;let lo=Math.max(0,d-1),hi=d;for(let n=0;n<12;n++){const m=(lo+hi)/2;if(profileAlt(m)<crz)lo=m;else hi=m}
  _td={k,v:hi};return hi}

/* constraints acting on the guidance now */
function cstrNow(){const r={clb:null,clbIx:null,des:null,desIx:null,spd:null};if(!flying()||!FL.path)return r;const A=FCU.alt;
  for(const c of cstrList(FL.path)){if(c.ix<=FL.fromIx&&!(c.ph==='des'&&c.spd))continue;
    const ahead=c.ix>FL.fromIx;
    if(ahead&&c.alt&&c.ph==='clb'&&(c.alt.t==='-'||c.alt.t==='@')&&c.alt.v<A-50&&(r.clb==null||c.alt.v<=r.clb)){r.clb=c.alt.v;r.clbIx=c.ix}
    if(ahead&&c.alt&&c.ph==='des'&&(c.alt.t==='+'||c.alt.t==='@')&&c.alt.v>A+50&&(r.des==null||c.alt.v>=r.des)){r.des=c.alt.v;r.desIx=c.ix}
    if(c.spd){if(c.ph==='clb'&&ahead&&['CLB','TAKEOFF'].includes(S.phase))r.spd=Math.min(r.spd??999,c.spd);
      if(c.ph==='des'&&['DES','APPR'].includes(S.phase)){const togo=c.s-FL.s;if(!ahead||togo<=Math.max(0,FL.ias-c.spd)*0.07+1)r.spd=Math.min(r.spd??999,c.spd)}}}
  return r}

/* ---------- vertical prediction along the path (altitude at each constrained waypoint) ---------- */
const MANAGED_V=['SRS','CLB','ALT CST*','ALT CST','DES','ALT CRZ'];
function vPredict(){try{const p=S.active;if(!p||!p.appr||!I().crz)return null;const P=vnPath();if(!P)return null;
  const crz=I().crz*100,cs=cstrList(P),td=flying()?FL.td:P.sThr-tdDist();
  let s=flying()?FL.s:0,alt=flying()?FL.alt:elevO();
  const ver=flying()?FL.ver:'CLB',mgdV=!flying()||MANAGED_V.includes(ver)||(ver==='ALT'&&FL.verArm.includes('DES'));
  const ceil0=flying()?(['CLB','SRS','ALT CST*','ALT CST','OP CLB','EXP CLB','ALT*'].includes(ver)?FCU.alt:Math.max(alt,ver==='V/S'&&FCU.vsVal>0?FCU.alt:alt)):crz;
  const wp={},lv=[];let held=null;
  for(let n=0;n<4000&&s<P.sThr;n++){const ds=0.5,dtg=P.sThr-s;
    if(s<td){let ceil=Math.min(ceil0,crz);
      if(mgdV)for(const c of cs)if(c.s>s&&c.ph==='clb'&&c.alt&&(c.alt.t==='-'||c.alt.t==='@')&&c.alt.v<ceil)ceil=c.alt.v;
      if(held!=null&&ceil>held+1&&alt>=held-20){lv.push({k:'sc',s,alt:held});held=null}
      if(alt<ceil-20){const vs=alt<10000?2800:alt<25000?2000:1300,gs=tasOf(alt<10000?250:mgd.clb(),alt);const na=Math.min(ceil,alt+vs*60/gs*ds);
        if(na>=ceil-1&&ceil<Math.min(ceil0,crz)-1&&held!==ceil){lv.push({k:'up',s:s+ds,alt:ceil});held=ceil}alt=na}}
    else{const pa=profileAlt(dtg);alt=Math.max(pa,alt-3000*60/tasOf(mgd.des(),alt)*ds);if(!mgdV)alt=Math.max(alt,0)}
    s+=ds;for(const c of cs)if(c.alt&&wp[c.ix]==null&&c.s<=s)wp[c.ix]=alt}
  const out={};for(const c of cs){if(!c.alt)continue;const a=wp[c.ix]??alt,v=c.alt.v;
    const met=c.alt.t==='+'?a>=v-60:c.alt.t==='-'?a<=v+60:Math.abs(a-v)<=150;out[c.ix]={alt:a,met}}
  return{wp:out,lv,mgd:mgdV}}catch(e){return null}}
let _vp={t:-1,k:null,v:null};
function vPred(){const k=planSig()+(flying()?Math.floor(FL.t/4):'g')+FCU.alt+(flying()?FL.ver:'');if(_vp.k!==k){_vp={k,v:vPredict()}}return _vp.v}
window.__vnav={cstrList,cstrNow,vPredict,profileAlt,tdDist};
