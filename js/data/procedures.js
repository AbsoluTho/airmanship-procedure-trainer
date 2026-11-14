'use strict';
/* ================= procedures (typed from charts) ================= */
const A=(t,v)=>({t,v});
const W=(id,o)=>Object.assign({k:'wpt',id},o||{});
const C2E=()=>[W('JN240',{alt:A('+',1600),spd:210,lbl:'C146°'}),W('JN242',{alt:A('-',7000),lbl:'C130°'}),W('ORPAR',{alt:A('-',7000),dist:8.2})];
const RIB=()=>[W('RIBIL',{alt:A('+',10000),dist:24.6})];
const C2W=()=>[W('JN254',{lbl:'C336°',dist:12.8}),W('JN276',{alt:A('@',6000),lbl:'C332°',dist:7.2}),W('JN383',{dist:10.4})];
const SIDS={OEJN:{
 '16C':{
  BOMO2E:[...C2E(),...RIB(),W('JN397',{alt:A('+',12000),dist:8.5}),W('BOMOX',{dist:51.3})],
  DATA2E:[...C2E(),...RIB(),W('JN229',{dist:15.6}),W('JN326',{alt:A('+',13000),dist:11.4}),W('DATAP',{dist:18.4})],
  EGRE2E:[...C2E(),...RIB(),W('JN229',{dist:15.6}),W('EGREP',{dist:28.1})],
  ISLA2E:[...C2E(),W('JN222',{dist:15.7}),W('ISLAM',{dist:11.1})],
  MIGD2E:[...C2E(),...RIB(),W('JN397',{alt:A('+',12000),dist:8.5}),W('JN398',{dist:10.9}),W('MIGDA',{dist:35.3})]},
 '34C':{
  BOMO2W:[...C2W(),W('JN234',{dist:6.2}),W('JN274',{dist:11.8}),W('BOMOX',{dist:16.7})],
  DATA2W:[...C2W(),W('RALVI',{dist:10.9}),W('JN510',{alt:A('-',13000),dist:25.3}),W('DATAP',{dist:8.0})],
  EGRE2W:[...C2W(),W('RALVI',{dist:10.9}),W('JN520',{alt:A('-',13000),dist:25.9}),W('EGREP',{dist:17.5})],
  ISLA2W:[...C2W(),W('RALVI',{dist:10.9}),W('JN530',{dist:19.4}),W('ISLAM',{alt:A('-',13000),dist:35.7})],
  MIGD2W:[...C2W(),W('JN234',{dist:6.2}),W('MIGDA',{dist:25.0})]}}};
/* approaches and STARs: js/data/procgen.js (tools/navdb/procgen.py, typed from the charts) */
const APPRS={};
const STARS={};
const AWY={L677:['MIGDA','RIDEP','YEN','RAGNO','ORGIM','TUGRU','WEJ'],V54:['WEJ','LABUN','NETOL','DEMSU','TBK'],M872:['WEJ','KULKI','TULOK','BOVET']};

/* Transition altitudes (ft). Check against the current AIP before relying on them. */
const TA={OEJN:13000,OETB:13000,OEMA:13000};
