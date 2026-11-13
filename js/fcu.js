'use strict';
/* ================= FCU =================
   Photo of the FCU (1000 x 350) with live displays drawn over it in the FlyByWire
   AirbusFCU font, and touch zones for the knobs (turn - / +, PULL, PUSH) and pushbuttons.
   Display formats follow the FlyByWire A32NX FCU components (GPL-3.0). */
const FCU={spdMgd:true,spd:null,mach:false,hdgMgd:true,hdg:null,hdgPre:null,hdgPreT:0,spdPre:null,spdPreT:0,
  alt:100,altInc:100,lvlch:true,vsVal:0,fpa:0,vsPre:null,vsPreT:0,trkFpa:false,ap1:false,ap2:false,athr:false,loc:false,appr:false,exped:false,metric:false};
const IMG_FCU='img/fcu.webp',FW=1000,FH=350,FAMB='#fde990';
const FK={spd:[145,197],hdg:[308,197],alt:[690,200],vs:[885,197]},KR=48;
const FB={ap1:[425,183,62,59],ap2:[515,183,62,59],athr:[468,273,62,58],loc:[290,290,62,52],exped:[645,290,62,52],appr:[845,290,62,52]};
const FBARS={ap1:[438,194,38,12],ap2:[528,194,38,12],athr:[481,286,35,12],loc:[306,301,35,12],exped:[659,301,35,12],appr:[859,301,35,12]};
const FROUND={spdmach:[42,150],trkfpa:[500,148],metric:[782,150]};
const fp=(v,t)=>(v/t*100).toFixed(3)+'%';
const inAir=()=>flying()&&!FL.ground;
const vrNow=()=>{const o=orig();return o?DB.apt[o].var||3:3};
const hdgNow=()=>Math.round(((acState().hdg)%360+360)%360)||360;

/* ---------- display ---------- */
let fcuG=null;
function drawFcu(){if(!fcuG)return;const g=fcuG,c=g.canvas,k=c.width/(917-82);g.setTransform(k,0,0,k,0,0);g.translate(-82,-26);
  g.clearRect(82,26,835,70);g.fillStyle='#0b0a08';g.fillRect(84,28,413,64);g.fillRect(503,28,413,64);
  const now=Date.now(),lbl=(t,x,y,al)=>{g.font='600 15px "Helvetica Neue",Arial,sans-serif';g.fillStyle=FAMB;g.textAlign=al||'left';g.textBaseline='alphabetic';g.fillText(t,x,y)};
  const seg=(t,x,y,al)=>{g.font='38px AirbusFCU,monospace';g.fillStyle=FAMB;g.textAlign=al||'left';g.textBaseline='alphabetic';g.fillText(t,x,y)};
  const dot=(x,y)=>{g.fillStyle=FAMB;g.beginPath();g.arc(x,y,9,0,7);g.fill()};
  /* SPD/MACH */
  lbl(FCU.mach?'MACH':'SPD',108,50);
  const spdPre=FCU.spdPre!=null&&now<FCU.spdPreT;
  if(FCU.spdMgd&&!spdPre){seg(FCU.mach?'-.--':'---',110,84);dot(205,70)}
  else{const v=spdPre?FCU.spdPre:FCU.spd;seg(FCU.mach?v.toFixed(2):String(Math.round(v)).padStart(3,'0'),110,84);if(FCU.spdMgd)dot(205,70)}
  /* HDG/TRK */
  lbl(FCU.trkFpa?'TRK':'HDG',275,50);lbl('LAT',355,50);lbl(FCU.trkFpa?'TRK':'HDG',443,68);
  const hdgPre=FCU.hdgPre!=null&&now<FCU.hdgPreT;
  if(FCU.hdgMgd&&!hdgPre)seg('---',278,84);else seg(String(hdgPre?FCU.hdgPre:FCU.hdg).padStart(3,'0'),278,84);
  if(FCU.hdgMgd)dot(372,70);
  /* ALT and V/S */
  lbl(FCU.trkFpa?'FPA':'V/S',516,68);lbl('ALT',668,50);lbl('LVL/CH',733,50);lbl(FCU.trkFpa?'FPA':'V/S',840,50);
  g.strokeStyle=FAMB;g.lineWidth=2;g.beginPath();g.moveTo(705,48);g.lineTo(705,40);g.lineTo(728,40);g.moveTo(796,40);g.lineTo(836,40);g.lineTo(836,48);g.stroke();
  seg(String(FCU.alt).padStart(5,'0'),612,84);
  const vMode=flying()&&(FL.ver==='V/S'||FL.ver==='FPA'),vsPre=FCU.vsPre!=null&&now<FCU.vsPreT;
  if(FCU.lvlch&&!vMode)dot(760,70);
  let vs;if(FCU.trkFpa){const f=vMode?FCU.fpa:vsPre?FCU.vsPre:null;vs=f==null?'~-.-':(f>=0?'+':'~')+Math.abs(f).toFixed(1)}
  else{const v=vMode?FCU.vsVal:vsPre?FCU.vsPre:null;vs=v==null?'~----':(v>=0?'+':'~')+String(Math.floor(Math.abs(v)/100)).padStart(2,'0')+'oo'}
  seg(vs,778,84);
  fcuLights()}
function fcuLights(){document.querySelectorAll('#fcu [data-fcu-light]').forEach(b=>b.classList.toggle('on',!!FCU[b.dataset.fcuLight]));
  const inc=$('#fcuInc');if(inc){inc.style.left=fp(FCU.altInc===100?649:718,FW);inc.style.top=fp(162,FH)}
  if(typeof EFIS==='undefined')return;const fd=$('#efis-fd'),ls=$('#efis-ls');if(fd)fd.classList.toggle('on',!!EFIS.fd);if(ls)ls.classList.toggle('on',!!EFIS.ls)}
function selHdgVal(){if(FCU.hdgPre!=null&&Date.now()<FCU.hdgPreT)return FCU.hdgPre;return FCU.hdgMgd?null:FCU.hdg}

/* ---------- knob and pushbutton logic ---------- */
function clampHdg(h){return((Math.round(h)-1)%360+360)%360+1}
function fcuTurn(knob,d,big){const now=Date.now();
  if(knob==='spd'){const st=FCU.mach?0.01:1;if(FCU.spdMgd){const b=FCU.spdPre!=null&&now<FCU.spdPreT?FCU.spdPre:(FCU.mach?+(FL.mach||0.78).toFixed(2):Math.round(flying()?FL.ias:(S.perf.v2||100)));
      FCU.spdPre=Math.max(FCU.mach?0.1:100,Math.min(FCU.mach?0.99:399,b+d*st*(big?10:1)));FCU.spdPreT=now+10000}
    else FCU.spd=Math.max(FCU.mach?0.1:100,Math.min(FCU.mach?0.99:399,+(FCU.spd+d*st*(big?10:1)).toFixed(2)))}
  if(knob==='hdg'){if(FCU.hdgMgd){const b=FCU.hdgPre!=null&&now<FCU.hdgPreT?FCU.hdgPre:hdgNow();FCU.hdgPre=clampHdg(b+d*(big?10:1));FCU.hdgPreT=now+10000}
    else FCU.hdg=clampHdg((FCU.hdg??hdgNow())+d*(big?10:1))}
  if(knob==='alt'){FCU.alt=Math.max(100,Math.min(49000,Math.round((FCU.alt+d*FCU.altInc)/FCU.altInc)*FCU.altInc||100))}
  if(knob==='vs'){const vMode=flying()&&(FL.ver==='V/S'||FL.ver==='FPA');
    if(FCU.trkFpa){if(vMode)FCU.fpa=Math.max(-9.9,Math.min(9.9,+(FCU.fpa+d*0.1).toFixed(1)));else{FCU.vsPre=Math.max(-9.9,Math.min(9.9,+((FCU.vsPre!=null&&now<FCU.vsPreT?FCU.vsPre:0)+d*0.1).toFixed(1)));FCU.vsPreT=now+10000}}
    else{if(vMode)FCU.vsVal=Math.max(-6000,Math.min(6000,FCU.vsVal+d*100));else{FCU.vsPre=Math.max(-6000,Math.min(6000,(FCU.vsPre!=null&&now<FCU.vsPreT?FCU.vsPre:Math.round((flying()?FL.vs:0)/100)*100)+d*100));FCU.vsPreT=now+10000}}}
  fcuRefresh()}
function fcuPush(knob,pull){const now=Date.now();
  if(knob==='spd'){if(pull){const pre=FCU.spdPre!=null&&now<FCU.spdPreT?FCU.spdPre:null;FCU.spd=pre??(FCU.mach?+(FL.mach||0.78).toFixed(2):Math.round(flying()?FL.ias:(S.perf.v2||150)));FCU.spdMgd=false;FCU.spdPre=null}
    else{if(!S.active)return err('NOT ALLOWED'),fcuRefresh();FCU.spdMgd=true;FCU.spdPre=null}}
  if(knob==='hdg'){if(pull){const pre=FCU.hdgPre!=null&&now<FCU.hdgPreT?FCU.hdgPre:null;FCU.hdg=pre??hdgNow();FCU.hdgMgd=false;FCU.hdgPre=null;fcuEvent('hdg-pull')}
    else{if(!S.active)return;FCU.hdgMgd=true;FCU.hdgPre=null;fcuEvent('hdg-push')}}
  if(knob==='alt'){FCU.lvlch=!pull;fcuEvent(pull?'alt-pull':'alt-push')}
  if(knob==='vs'){if(pull){const pre=FCU.vsPre!=null&&now<FCU.vsPreT?FCU.vsPre:null;if(FCU.trkFpa)FCU.fpa=pre??0;else FCU.vsVal=pre??Math.round((flying()?FL.vs:0)/100)*100;FCU.vsPre=null;FCU.lvlch=false;fcuEvent('vs-pull')}
    else{FCU.lvlch=false;fcuEvent('vs-push')}}
  fcuRefresh()}
function fcuButton(b){const air=inAir();
  if(b==='ap1'||b==='ap2'){const o=b==='ap1'?'ap2':'ap1';if(FCU[b]){FCU[b]=false}else{if(!air||FL.alt-groundElev()<100)return fcuRefresh();FCU[b]=true;if(!FCU.appr&&!FCU.loc)FCU[o]=false}}
  if(b==='athr')FCU.athr=!FCU.athr;
  if(b==='loc'){if(!hasLsSel())return fcuRefresh();if(FCU.loc){FCU.loc=false}else{FCU.loc=true;FCU.appr=false}}
  if(b==='appr'){if(!hasLsSel())return fcuRefresh();if(FCU.appr){FCU.appr=false;if(FCU.ap1&&FCU.ap2)FCU.ap2=false}else{FCU.appr=true;FCU.loc=false}}
  if(b==='exped'){FCU.exped=!FCU.exped;fcuEvent('exped')}
  if(b==='spdmach'){if(!FCU.spdMgd&&FCU.spd!=null){const alt=flying()?FL.alt:0;FCU.spd=FCU.mach?Math.round(iasOf(FCU.spd*sos(alt),alt)):+(tasOf(FCU.spd,alt)/sos(alt)).toFixed(2)}FCU.mach=!FCU.mach}
  if(b==='trkfpa'){FCU.trkFpa=!FCU.trkFpa;if(flying()){if(FL.lat==='HDG')FL.lat='TRK';else if(FL.lat==='TRK')FL.lat='HDG';if(FL.ver==='V/S')FL.ver='FPA';else if(FL.ver==='FPA')FL.ver='V/S'}}
  if(b==='metric')FCU.metric=!FCU.metric;
  if(b==='inc100')FCU.altInc=100;if(b==='inc1000')FCU.altInc=1000;
  if(flying())setFma();fcuRefresh()}
function hasLsSel(){const p=S.active;return!!(p&&p.appr&&/^(ILS|LOC)/.test(p.appr))}
function fcuRefresh(){if(typeof refreshAll==='function')refreshAll();else drawFcu()}

/* ---------- build the panel ---------- */
function buildFcu(){const host=$('#fcu');if(!host)return;
  let h=`<img class="fcu-img" src="${IMG_FCU}" alt="FCU"><canvas class="fcu-disp" style="left:${fp(82,FW)};top:${fp(26,FH)};width:${fp(835,FW)};height:${fp(70,FH)}"></canvas>`;
  for(const[k,[cx,cy]]of Object.entries(FK))h+=`<button type="button" class="fz knobz" data-knob="${k}" aria-label="${k.toUpperCase()} knob: turn, pull or push" style="left:${fp(cx-KR-6,FW)};top:${fp(cy-KR-6,FH)};width:${fp(2*KR+12,FW)};height:${fp(2*KR+12,FH)}"></button>`;
  for(const[k,[x,y,w,hh]]of Object.entries(FB)){const[bx,by,bw,bh]=FBARS[k];
    h+=`<button type="button" class="fb2" data-fbtn="${k}" aria-label="${k.toUpperCase()}" style="left:${fp(x,FW)};top:${fp(y,FH)};width:${fp(w,FW)};height:${fp(hh,FH)}"></button>`;
    h+=`<i class="fbar" data-fcu-light="${k}" style="left:${fp(bx,FW)};top:${fp(by,FH)};width:${fp(bw,FW)};height:${fp(bh,FH)}"></i>`}
  for(const[k,[cx,cy]]of Object.entries(FROUND))h+=`<button type="button" class="fb2 rnd" data-fbtn="${k}" aria-label="${k.toUpperCase()}" style="left:${fp(cx-30,FW)};top:${fp(cy-30,FH)};width:${fp(60,FW)};height:${fp(60,FH)}"></button>`;
  h+=`<button type="button" class="fb2" data-fbtn="inc100" aria-label="ALT 100" style="left:${fp(628,FW)};top:${fp(132,FH)};width:${fp(42,FW)};height:${fp(28,FH)}"></button>`;
  h+=`<button type="button" class="fb2" data-fbtn="inc1000" aria-label="ALT 1000" style="left:${fp(694,FW)};top:${fp(132,FH)};width:${fp(48,FW)};height:${fp(28,FH)}"></button>`;
  h+=`<span class="finc" id="fcuInc" aria-hidden="true"></span>`;
  host.innerHTML=h;fcuG=host.querySelector('.fcu-disp').getContext('2d');
  const cv=host.querySelector('.fcu-disp');new ResizeObserver(()=>{const d=devicePixelRatio||1;cv.width=Math.round(cv.clientWidth*d);cv.height=Math.round(cv.clientHeight*d);drawFcu()}).observe(cv);
  host.querySelectorAll('[data-knob]').forEach(b=>{b.addEventListener('click',()=>openKnob(b.dataset.knob,b));
    b.addEventListener('wheel',e=>{e.preventDefault();fcuTurn(b.dataset.knob,e.deltaY<0?1:-1)},{passive:false})});
  host.querySelectorAll('[data-fbtn]').forEach(b=>b.addEventListener('click',()=>fcuButton(b.dataset.fbtn)));
  if(document.fonts)document.fonts.load('38px AirbusFCU').then(drawFcu).catch(()=>{});
  setInterval(()=>{if(FCU.hdgPre!=null||FCU.spdPre!=null||FCU.vsPre!=null)drawFcu()},1000);
  drawFcu()}
/* ---------- knob pad: large touch controls for the selected knob ---------- */
const KNAME={spd:'SPD/MACH',hdg:FCU.trkFpa?'TRK':'HDG',alt:'ALT',vs:'V/S'};
function knobValue(k){const now=Date.now();
  if(k==='spd')return FCU.spdMgd&&!(FCU.spdPre!=null&&now<FCU.spdPreT)?'MANAGED':String(FCU.spdPre!=null&&now<FCU.spdPreT?FCU.spdPre:FCU.spd);
  if(k==='hdg'){const v=selHdgVal();return v==null?'MANAGED (NAV)':String(v).padStart(3,'0')}
  if(k==='alt')return FCU.alt+' FT · step '+FCU.altInc;
  if(k==='vs'){const vm=flying()&&(FL.ver==='V/S'||FL.ver==='FPA');return FCU.trkFpa?(vm?FCU.fpa.toFixed(1)+'°':'--'):(vm?FCU.vsVal+' FT/MIN':'--')}}
let padKnob=null;
function openKnob(k,anchor){closeKnob();padKnob=k;const pad=document.createElement('div');pad.className='knobpad';pad.id='knobpad';pad.setAttribute('role','dialog');pad.setAttribute('aria-label',k.toUpperCase()+' knob');
  const nm=k==='hdg'?(FCU.trkFpa?'TRK':'HDG'):k==='vs'?(FCU.trkFpa?'FPA':'V/S'):k==='spd'?(FCU.mach?'MACH':'SPD'):'ALT';
  pad.innerHTML=`<div class="kp-h"><b>${nm}</b><span id="kpVal"></span><button type="button" class="kp-x" aria-label="Close">✕</button></div>
   <div class="kp-r"><button type="button" class="kp" data-kt="-1">− turn</button><button type="button" class="kp" data-kt="1">turn +</button></div>
   <div class="kp-r"><button type="button" class="kp pp" data-kp="pull">PULL<small>${k==='alt'?'open climb/descent':k==='vs'?'V/S selected':k==='hdg'?'heading selected':'speed selected'}</small></button><button type="button" class="kp pp" data-kp="push">PUSH<small>${k==='alt'?'managed climb/descent':k==='vs'?'level off':k==='hdg'?'NAV (managed)':'managed speed'}</small></button></div>
   ${k==='alt'?'<div class="kp-r"><button type="button" class="kp sm" data-ki="100">STEP 100</button><button type="button" class="kp sm" data-ki="1000">STEP 1000</button></div>':''}`;
  document.body.appendChild(pad);const r=anchor.getBoundingClientRect(),pw=pad.offsetWidth,ph=pad.offsetHeight;
  let x=r.left+r.width/2-pw/2,y=r.bottom+8;if(y+ph>innerHeight-8)y=r.top-ph-8;x=Math.max(8,Math.min(innerWidth-pw-8,x));pad.style.left=x+'px';pad.style.top=Math.max(8,y)+'px';
  pad.querySelector('.kp-x').onclick=closeKnob;
  pad.querySelectorAll('[data-kt]').forEach(b=>{let t1=null,t2=null,n=0;const stop=()=>{clearTimeout(t1);clearInterval(t2)};
    b.addEventListener('pointerdown',e=>{e.preventDefault();n=0;fcuTurn(k,+b.dataset.kt);kpUpd();t1=setTimeout(()=>{t2=setInterval(()=>{n++;fcuTurn(k,+b.dataset.kt,n>12);kpUpd()},90)},380)});
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop))});
  pad.querySelectorAll('[data-kp]').forEach(b=>b.onclick=()=>{fcuPush(k,b.dataset.kp==='pull');kpUpd()});
  pad.querySelectorAll('[data-ki]').forEach(b=>b.onclick=()=>{fcuButton(b.dataset.ki==='100'?'inc100':'inc1000');kpUpd()});
  kpUpd();setTimeout(()=>document.addEventListener('pointerdown',outside,true),0)}
function outside(e){const p=$('#knobpad');if(p&&!p.contains(e.target)&&!e.target.closest('[data-knob]'))closeKnob()}
function closeKnob(){const p=$('#knobpad');if(p)p.remove();padKnob=null;document.removeEventListener('pointerdown',outside,true)}
function kpUpd(){const v=$('#kpVal');if(v&&padKnob)v.textContent=knobValue(padKnob)}
buildFcu();
window.__FCU=FCU;window.__fcuTurn=fcuTurn;window.__fcuPush=fcuPush;window.__fcuButton=fcuButton;

/* ---------- layout: the deck (EFIS + FCU, PFD + ND) is sized to match the MCDU height ---------- */
function layoutDeck(){const sec=$('#v-mcdu');if(!sec||!sec.classList.contains('on'))return;const cs=getComputedStyle(sec);
  const Wc=sec.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),top=sec.getBoundingClientRect().top+scrollY,availH=Math.max(440,innerHeight-top-58);
  let W2,mw;if(Wc<900){W2=Wc;mw=Math.min(Wc,563)}
  else{const Hm=Math.min(availH,(Wc-9)/1.8324,880);mw=Hm/1.5631;W2=(Hm-6)/0.83848+6}
  const r=document.documentElement.style;r.setProperty('--deckw',Math.floor(W2)+'px');r.setProperty('--mw',Math.floor(mw)+'px')}
addEventListener('resize',layoutDeck);new ResizeObserver(layoutDeck).observe(document.body);layoutDeck();
