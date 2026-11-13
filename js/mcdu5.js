'use strict';
/* ================= MCDU / FMGC, part 5 =================
   Pseudo waypoints on the F-PLN: (T/C), (T/D) and (DECEL), where the approach phase is activated
   in NAV or LOC (ND: magenta D). Go-around support: ACTIVATE APPR PHASE on PERF GO AROUND for a
   new approach after a missed approach. Simplified for procedure training. */

/* pseudo waypoints of the active F-PLN, ahead of the aircraft, with their position along the path */
function pwList(p){try{if(!p||p!==S.active||S.tmpy||S.secMode||!I().crz)return[];const P_=flying()&&FL.path?FL.path:vnPath();if(!P_)return[];
  const s0=flying()?FL.s:0,crz=I().crz*100,out=[];
  if(!flying())out.push({id:'(T/C)',s:PM.climb(I().crz).d,alt:crz});
  else if(['TAKEOFF','CLB'].includes(S.phase)&&FL.vs>200&&FL.alt<crz-100)out.push({id:'(T/C)',s:FL.s+(crz-FL.alt)/FL.vs*60*FL.gs/3600,alt:crz});
  if(p.appr){const td=flying()?FL.td:P_.sThr-tdDist();if(td!=null&&s0<td&&!['DES','APPR','GA','DONE'].includes(S.phase))out.push({id:'(T/D)',s:td,alt:crz});
    const sd=P_.sThr-DECEL_NM;if(s0<sd&&!['APPR','DONE'].includes(S.phase))out.push({id:'(DECEL)',s:sd,alt:Math.min(crz,profileAlt(DECEL_NM))})}
  return out.filter(x=>x.s>s0+0.1&&x.s<P_.sThr)}catch(e){return[]}}
{const f0=fplnRows;fplnRows=function(p){const rows=f0(p);const pw=pwList(p);if(!pw.length)return rows;
  const P_=flying()&&FL.path?FL.path:vnPath(),sOf=ix=>{const pt=P_.pts.find(q=>q.ix===ix);return pt?pt.s:null};
  for(const w of pw.sort((a,b)=>b.s-a.s)){const at=rows.findIndex(r=>r.k!=='pw'&&r.ix!=null&&sOf(r.ix)!=null&&sOf(r.ix)>w.s);if(at>0)rows.splice(at,0,{k:'pw',id:w.id,s:w.s,alt:w.alt})}
  return rows}}
function fplnPwRow(r,ln,lb,col){put(ln,0,r.id,col);let t='----';
  if(flying())t=utcStr(FL.utc0+(FL.t+(r.s-FL.s)/Math.max(150,FL.gs)*3600)*1000);else{const pr=predict();if(pr)t=hhmm(pr.trip.at(r.s)+1)}
  put(ln,8,t,col);const a=Math.round(r.alt/10)*10,al=a>=(TA[orig()]||13000)?'FL'+String(Math.round(a/100)).padStart(3,'0'):String(a);put(ln,13,' ---/','w');put(ln,18,al.padStart(6),col)}
/* pseudo waypoint lines cannot be revised */
{const lsk0=P.FPLN.lsk;P.FPLN.lsk=function(s,n){const p=cur();if(p&&n<6){const r=fplnRows(p)[S.fpOff+n-1];if(r&&r.k==='pw')return err('NOT ALLOWED')}return lsk0.call(this,s,n)}}

/* PERF GO AROUND: ACTIVATE APPR PHASE (CONFIRM) in the GA phase, for another approach */
{const r0=P.PERFGA.render;P.PERFGA.render=function(){r0.call(this);if(S.phase==='GA'){for(const r of[12,13])for(let c=0;c<12;c++)BUF[r-1][c]={ch:' ',c:'w',s:'L'};
   if(S.apprArm){put(12,1,'CONFIRM','a','S');put(13,0,'*APPR PHASE','a')}else{put(12,1,'ACTIVATE','w','S');put(13,0,'{APPR PHASE','b')}}}
 const l0=P.PERFGA.lsk;P.PERFGA.lsk=function(s,n){if(s+n==='L6'&&S.phase==='GA'){if(S.apprArm){S.phase='APPR';S.apprArm=false;go('PERFAPPR')}else S.apprArm=true;return}return l0.call(this,s,n)}}
