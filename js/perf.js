'use strict';
/* ================= performance model =================
   A generic, simplified A320-class model so that INIT B, PERF TAKE OFF and the F-PLN
   show plausible numbers. It is NOT the FMGS performance database and NOT a
   performance tool: never use its figures for real flight planning. */
const PM={
  climb(fl){return{d:fl*0.37,t:fl*0.062,f:0.25+fl*0.0038}},           /* NM, min, t at 65 t */
  desc(fl){return{d:fl*0.33+12,t:fl*0.06+6,f:0.2+fl*0.0006}},
  tas(fl,ci){return(fl>=290?447:250+fl*0.58)+(ci||0)*0.2},
  ff(fl,ci){return 2.35*(1+(340-fl)*0.0012)*(1+(ci||0)*0.0008)},       /* t/h at 65 t */
  wf(gw){return Math.pow(gw/65,0.8)},
  hold(gw){return 2.2*this.wf(gw)}};                                    /* t/h */

/* Flight profile over a distance: returns time (min) and fuel (t), plus a time(d) function. */
function profile(D,fl,ci,gw,wind){const c=PM.climb(fl),d=PM.desc(fl),w=PM.wf(gw),wi=wind||0;
  let k=1;if(c.d+d.d>D)k=D/(c.d+d.d);
  const cd=c.d*k,dd=d.d*k,crz=Math.max(0,D-cd-dd);
  const vc=cd/(c.t*k)*60+wi/2,vd=dd/(d.t*k)*60+wi/2,gs=PM.tas(fl,ci)+wi;
  const tc=cd/vc*60,td=dd/vd*60,tz=crz/gs*60;
  const fuel=(c.f*k+d.f*k)*w+PM.ff(fl,ci)*w*tz/60+0.15;
  const at=x=>x<=cd?x/vc*60:x<=cd+crz?tc+(x-cd)/gs*60:tc+tz+Math.min(x-cd-crz,dd)/vd*60;
  return{time:tc+tz+td+2,fuel,at}}

/* Cumulative distance from the origin for every leg (discontinuities bridged direct). */
function cumDist(p){let prev=null,acc=0;return p.legs.map(l=>{
  const pos=legPos(l);if(l.k==='orig'){prev=pos;return 0}
  if(l.k==='disc'||l.seg==='map')return null;
  if(l.k==='proc'){acc+=l.dist||0;return null}
  if(!pos)return null;
  acc+=l.dist!=null?l.dist:(prev?gc(prev,pos):0);prev=pos;return acc})}

/* Full fuel prediction for INIT B and the F-PLN. Needs FROM/TO, CRZ FL, ZFW and BLOCK. */
function predict(){const p=S.active,i=I(),f=S.fuel;
  if(!p||!i.crz||f.zfw==null||f.block==null)return null;
  const di=idxK(p,'dest'),cum=cumDist(p),D=cum[di];if(!D)return null;
  const taxi=f.taxi??0.2,tow=f.zfw+f.block-taxi,wind=f.wind||0;
  let trip=profile(D,i.crz,i.ci,tow,wind);trip=profile(D,i.crz,i.ci,tow-trip.fuel/2,wind);
  const lw=tow-trip.fuel;
  const pct=f.rsvPct??5,rsv=f.rsv??trip.fuel*pct/100;
  let altn={fuel:0,time:0};const dest=legPos(p.legs[di]);
  if(i.altn&&DB.apt[i.altn]){const Da=gc(dest,DB.apt[i.altn].pos)*1.05+15;
    const fl=Math.max(100,Math.min(310,Math.round(Da*0.85/10)*10));altn=profile(Da,fl,0,lw,0)}
  const altnF=f.altn??altn.fuel;
  const hff=PM.hold(lw-altnF);
  const finT=f.finalTime??30,finF=f.final??hff*finT/60;
  const extra=f.block-taxi-trip.fuel-rsv-altnF-finF;
  return{D,cum,taxi,tow,lw,trip,rsv,pct,altn:{fuel:altnF,time:altn.time},final:{fuel:finF,time:f.final!=null?f.final/hff*60:finT},
    extra:{fuel:extra,time:extra/PM.hold(lw)*60},minFob:f.minFob??(altnF+finF)}}

/* Characteristic speeds from the takeoff weight (rule-of-thumb approximations). */
function charSpeeds(tow){return{F:Math.round(0.95*tow+84),S:Math.round(1.1*tow+120),O:Math.round(2*tow+85)}}
