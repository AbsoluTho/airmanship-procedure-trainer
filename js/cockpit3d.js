'use strict';
/* ================= cockpit 3D ================= */
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
let p3=null;
function init3D(){if(p3)return p3;p3=build3D().catch(e=>{console.error(e);$('#v-3d').insertAdjacentHTML('beforeend','<div class="err3d">3D view could not start on this device ('+String(e&&e.message||e)+').</div>')});return p3}
async function build3D(){
  const T=window.THREE;if(!T)throw new Error('THREE missing');
  const [ck,el,apu]=await Promise.all([loadImg(IMG.cockpit),loadImg(IMG.elec),loadImg(IMG.apu)]);
  const host=$('#v-3d');
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;
  host.prepend(renderer.domElement);const cvs=renderer.domElement;
  const scene=new T.Scene();scene.background=new T.Color(0x06090c);
  const cam=new T.PerspectiveCamera(62,1,0.01,300);const EYE=new T.Vector3(0,1.08,0.20);cam.position.copy(EYE);
  const aniso=renderer.capabilities.getMaxAnisotropy();
  const mkTex=c=>{const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=aniso;return t};
  const crop=(x,y,w,h,s)=>{s=s||1;const c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);
    const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(ck,x,y,w,h,0,0,c.width,c.height);return c};
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  function plane(mat,w,h,center,X,Y,parent){const m=new T.Mesh(new T.PlaneGeometry(w,h),mat);
    const Z=new T.Vector3().crossVectors(X,Y).normalize();m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X.clone().normalize(),Y.clone().normalize(),Z));
    m.position.copy(center);(parent||scene).add(m);return m}
  const basic=t=>new T.MeshBasicMaterial({map:t,alphaTest:0.5});
  const dark=c=>new T.MeshBasicMaterial({color:c});
  /* sky */
  {const c=document.createElement('canvas');c.width=4;c.height=512;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,512);
   gr.addColorStop(0,'#0f3a72');gr.addColorStop(.42,'#5f9fd0');gr.addColorStop(.5,'#d8e6ef');gr.addColorStop(.505,'#c2a57c');gr.addColorStop(.6,'#a08259');gr.addColorStop(1,'#4d3f2c');
   g.fillStyle=gr;g.fillRect(0,0,4,512);const t=mkTex(c);const s=new T.Mesh(new T.SphereGeometry(80,32,16),new T.MeshBasicMaterial({map:t,side:T.BackSide}));s.position.copy(EYE);scene.add(s)}
  /* panels */
  const X=V(1,0,0);
  const MW=2.0,MH=MW*355/1100;
  const mainP=plane(basic(mkTex(crop(0,967,1100,355,1.5))),MW,MH,V(0,0.80,-0.85),X,V(0,1,0));
  /* live NDs on the main panel (captain and first officer) */
  const NDS=[[286,134,94,95],[717,134,93,95]].map(([x,y,w,h])=>{const c=document.createElement('canvas');c.width=c.height=512;const t=mkTex(c);
    plane(basic(t),w/1100*MW,h/355*MH,V(((x+w/2)/1100-.5)*MW,(.5-(y+h/2)/355)*MH,0.002),V(1,0,0),V(0,1,0),mainP);return{c,g:c.getContext('2d'),t}});
  function drawNd3(){NDS.forEach(n=>{drawND(n.g,512,512,S.elec.ext);n.t.needsUpdate=true});dirty=true}
  const oF=V(0,1.52,-0.72),oA=V(0,1.74,0.71),OW=0.92,OL=oA.distanceTo(oF);
  const ovh=plane(basic(mkTex(crop(245,0,615,968,2))),OW,OL,oF.clone().add(oA).multiplyScalar(.5),X,oA.clone().sub(oF));
  const pF=V(0,0.47,-0.80),pA=V(0,0.24,-0.12),PW=0.44,PL=PW*790/488;
  const PS=3,pedBase=crop(304,1326,488,790,PS);const pedC=document.createElement('canvas');pedC.width=pedBase.width;pedC.height=pedBase.height;
  const pedG=pedC.getContext('2d');pedG.drawImage(pedBase,0,0);const pedT=mkTex(pedC);
  const ped=plane(basic(pedT),PW,pedF_len(),pF.clone().add(pA).multiplyScalar(.5),X,pF.clone().sub(pA));
  function pedF_len(){return pF.distanceTo(pA)}
  plane(basic(mkTex(crop(16,1448,280,232,1.5))),0.36,0.36*232/280,V(-0.80,0.50,-0.40),X,V(0,0,-1));
  plane(basic(mkTex(crop(808,1448,280,232,1.5))),0.36,0.36*232/280,V(0.80,0.50,-0.40),X,V(0,0,-1));
  /* shell */
  const shell=dark(0x151b22),shell2=dark(0x1d252e);
  plane(shell,3,3,V(0,0,0),X,V(0,0,-1));
  plane(shell,2.4,1.15,V(-1.0,0.575,-0.1),V(0,0,-1),V(0,1,0));plane(shell,2.4,1.15,V(1.0,0.575,-0.1),V(0,0,1),V(0,1,0));
  plane(shell,2.4,0.5,V(-1.0,1.8,-0.1),V(0,0,-1),V(0,1,0));plane(shell,2.4,0.5,V(1.0,1.8,-0.1),V(0,0,1),V(0,1,0));
  plane(shell,2.2,2.4,V(0,1.95,-0.1),X,V(0,0,1));
  plane(shell,2.2,2.2,V(0,1.0,1.0),V(-1,0,0),V(0,1,0));
  plane(shell2,2.0,0.48,V(0,0.24,-0.86),X,V(0,1,0));
  plane(shell2,2.0,0.22,V(0,1.135,-0.96),X,V(0,0.03,-0.22));
  const box=(w,h,d,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),shell);m.position.set(x,y,z);scene.add(m)};
  box(0.07,0.45,0.05,0,1.36,-1.02);box(0.1,0.45,0.08,-0.97,1.36,-0.95);box(0.1,0.45,0.08,0.97,1.36,-0.95);box(2.0,0.05,0.35,0,1.56,-0.9);
  box(0.06,0.42,0.06,-1.0,1.36,-0.25);box(0.06,0.42,0.06,1.0,1.36,-0.25);
  /* hi-res ELEC and APU overlays on the overhead */
  function overlay(img,x,y,w,h){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');
    const t=mkTex(c);const u=(x+w/2-245)/615,v=(y+h/2)/968;
    const m=plane(basic(t),w/615*OW,h/968*OL,V((u-.5)*OW,(.5-v)*OL,0.002),V(1,0,0),V(0,1,0),ovh);return{c,g,t,m,img}}
  const E=overlay(el,386,699,330,77),Ap=overlay(apu,532,893,34,58);
  function lens(g,x1,y1,x2,y2,txt,col,lit,fs){g.fillStyle='#0a0c0e';g.fillRect(x1,y1,x2-x1,y2-y1);
    g.font=`700 ${fs}px "IBM Plex Sans",Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';
    if(lit){g.shadowColor=col;g.shadowBlur=fs*.6;g.fillStyle=col}else{g.shadowBlur=0;g.fillStyle='#3a4148'}
    g.fillText(txt,(x1+x2)/2,(y1+y2)/2+1);g.shadowBlur=0;
    if(!lit){g.strokeStyle='#2a3036';g.lineWidth=1.5;g.strokeRect(x1+3,y1+2,x2-x1-6,y2-y1-4)}}
  const WHITE='#f4f6f8',BLUE='#38c8ff',GREEN='#43f25a',AMB='#ffa21f';
  function drawPanels(){const e=S.elec,dc=e.bat1||e.bat2||e.ext;
    E.g.drawImage(el,0,0);lens(E.g,432,53,468,68,'OFF',WHITE,!e.bat1,12);lens(E.g,483,53,519,68,'OFF',WHITE,!e.bat2,12);
    lens(E.g,603,170,644,188,'AVAIL',GREEN,!e.ext,11);lens(E.g,603,191,644,207,'ON',BLUE,e.ext,12);E.t.needsUpdate=true;
    Ap.g.drawImage(apu,0,0);lens(Ap.g,92,108,163,135,'FAULT',AMB,false,17);lens(Ap.g,92,154,163,180,'ON',BLUE,e.apu&&dc,19);
    lens(Ap.g,92,255,163,282,'AVAIL',GREEN,false,17);lens(Ap.g,92,301,163,328,'ON',BLUE,false,19);Ap.t.needsUpdate=true;
    $('#hud').innerHTML=[['BAT 1',e.bat1?'AUTO':'OFF',e.bat1],['BAT 2',e.bat2?'AUTO':'OFF',e.bat2],['EXT PWR',e.ext?'ON':'AVAIL',e.ext],['APU MASTER',e.apu?'ON':'OFF',e.apu],
      ['DC BUS',dc?'POWERED':'UNPOWERED',dc],['AC BUS',e.ext?'EXT PWR':'UNPOWERED',e.ext]].map(([a,b,on])=>`<div>${a.padEnd(11,' ')}<span class="${on?'on':'off'}">${b}</span></div>`).join('');
    dirty=true}
  /* live MCDU screens on the pedestal */
  const MS=[[31,21,94,73],[368,21,93,73]];
  const COL={w:'#fff',g:'#3df24e',b:'#3fd2ff',a:'#ffa21f',m:'#ff6cf6',y:'#fff23d'};
  function drawMcdu(){pedG.drawImage(pedBase,0,0);
    for(const[x,y,w,h]of MS){const X0=x*PS,Y0=y*PS,W0=w*PS,H0=h*PS;pedG.fillStyle='#04060a';pedG.fillRect(X0,Y0,W0,H0);
      if(!S.elec.ext||!BUF)continue;const ix=X0+W0*.03,iy=Y0+H0*.05,iw=W0*.94,ih=H0*.9,lh=ih/14,cw=iw/24;
      pedG.textAlign='center';pedG.textBaseline='middle';
      BUF.forEach((row,r)=>row.forEach((c,ci)=>{if(c.ch===' ')return;const fs=(c.s==='S'?0.72:0.95)*Math.min(lh,cw/0.6);
        pedG.fillStyle=COL[c.c];pedG.strokeStyle=COL[c.c];const cx=ix+cw*(ci+.5),cy=iy+lh*(r+.5);
        if(c.ch===BOX){pedG.lineWidth=Math.max(1,fs*.08);pedG.strokeRect(cx-fs*.3,cy-fs*.38,fs*.6,fs*.76)}
        else{pedG.font=`500 ${fs}px "IBM Plex Mono",monospace`;pedG.fillText(c.ch,cx,cy)}}))}
    pedT.needsUpdate=true;dirty=true}
  window.__draw3D=()=>{if(view==='3d'){drawMcdu();drawNd3()}};
  /* camera control */
  let yaw=0,pitch=-0.2,dirty=true,tw=null;
  function aimAt(t){const d=t.clone().sub(EYE);return{yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))}}
  function applyCam(){const cp=Math.cos(pitch);cam.lookAt(EYE.x-Math.sin(yaw)*cp,EYE.y+Math.sin(pitch),EYE.z-Math.cos(yaw)*cp);cam.updateProjectionMatrix();dirty=true}
  const VIEWS=[['Main panel',V(0,0.80,-0.85),62],['FCU',V(0,1.09,-0.85),26],['Overhead',V(0,1.58,-0.42),60],['ELEC / APU',V(0,1.585,-0.36),24],['Pedestal',V(0,0.36,-0.47),52],['MCDU',V(-0.151,0.44,-0.71),21]];
  function goView(t,f){const a=aimAt(t);tw={y0:yaw,p0:pitch,f0:cam.fov,y1:a.yaw,p1:a.pitch,f1:f,t0:performance.now()}}
  const vb=$('#vbar');VIEWS.forEach(([n,t,f])=>{const b=document.createElement('button');b.className='btn sm';b.type='button';b.textContent=n;b.onclick=()=>goView(t,f);vb.appendChild(b)});
  {const a=aimAt(VIEWS[0][1]);yaw=a.yaw;pitch=a.pitch;applyCam()}
  const ptr=new Map();let moved=false,pinch=null;
  const clampC=()=>{pitch=Math.max(-1.45,Math.min(1.45,pitch));yaw=Math.max(-2.2,Math.min(2.2,yaw));cam.fov=Math.max(12,Math.min(80,cam.fov))};
  cvs.addEventListener('pointerdown',e=>{cvs.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});tw=null;
    if(ptr.size===1)moved=false;if(ptr.size===2){const[a,b]=[...ptr.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),f:cam.fov};moved=true}});
  cvs.addEventListener('pointermove',e=>{const q=ptr.get(e.pointerId);if(!q)return;const dx=e.clientX-q.x,dy=e.clientY-q.y;q.x=e.clientX;q.y=e.clientY;
    if(ptr.size===1){if(Math.hypot(e.clientX-q.sx,e.clientY-q.sy)>7)moved=true;if(moved){const k=cam.fov*D2R/cvs.clientHeight;yaw+=dx*k;pitch+=dy*k;clampC();applyCam()}}
    else if(ptr.size===2&&pinch){const[a,b]=[...ptr.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);cam.fov=pinch.f*pinch.d/Math.max(d,1);clampC();applyCam()}});
  const end=e=>{const q=ptr.get(e.pointerId);if(!q)return;if(ptr.size===1&&!moved&&e.type==='pointerup')tap(e);ptr.delete(e.pointerId);if(ptr.size<2)pinch=null};
  cvs.addEventListener('pointerup',end);cvs.addEventListener('pointercancel',end);
  cvs.addEventListener('wheel',e=>{e.preventDefault();cam.fov*=1+e.deltaY*0.0012;clampC();applyCam()},{passive:false});
  /* taps */
  const ray=new T.Raycaster();
  const inR=(px,py,r,pad)=>px>=r[0]-pad&&px<=r[2]+pad&&py>=r[1]-pad&&py<=r[3]+pad;
  let toastT=null;function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),1300)}
  function tap(e){const r=cvs.getBoundingClientRect();ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1},cam);
    const hit=ray.intersectObjects([E.m,Ap.m,ped],false)[0];if(!hit||!hit.uv)return;const u=hit.uv.x,v=1-hit.uv.y,el2=S.elec;
    const pad=Math.max(4,cam.fov/4);
    if(hit.object===E.m){const px=u*1000,py=v*234;
      if(inR(px,py,[425,25,472,74],pad)){el2.bat1=!el2.bat1;toast('BAT 1 '+(el2.bat1?'AUTO':'OFF'))}
      else if(inR(px,py,[476,25,525,74],pad)){el2.bat2=!el2.bat2;toast('BAT 2 '+(el2.bat2?'AUTO':'OFF'))}
      else if(inR(px,py,[599,161,649,211],pad)){el2.ext=!el2.ext;toast('EXT PWR '+(el2.ext?'ON':'AVAIL'))}
      else return;drawPanels();drawMcdu();drawNd3()}
    else if(hit.object===Ap.m){const px=u*225,py=v*386;if(inR(px,py,[60,85,195,200],pad*2)){el2.apu=!el2.apu;toast('APU MASTER SW '+(el2.apu?'ON':'OFF'));drawPanels()}}
    else{const px=u*488,py=v*790;if(px>=6&&px<=146&&py<=206)openMcdu('capt');else if(px>=348&&px<=488&&py<=206)openMcdu('fo')}}
  /* loop */
  new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();dirty=true}).observe(host);
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  (function loop(){requestAnimationFrame(loop);
    if(tw){const k=Math.min(1,(performance.now()-tw.t0)/550),e=ease(k);yaw=tw.y0+(tw.y1-tw.y0)*e;pitch=tw.p0+(tw.p1-tw.p0)*e;cam.fov=tw.f0+(tw.f1-tw.f0)*e;applyCam();if(k>=1)tw=null}
    if(dirty&&view==='3d'){renderer.render(scene,cam);dirty=false}})();
  drawPanels();drawMcdu();drawNd3();
  window.__dbg3d={cam,scene,get yaw(){return yaw},get pitch(){return pitch},tapAt:(x,y)=>tap({clientX:x,clientY:y,type:'pointerup'}),goView:(i)=>goView(VIEWS[i][1],VIEWS[i][2]),
    proj:(w,u,v)=>{const m={elec:E.m,apu:Ap.m,ped:ped}[w];const g=m.geometry.parameters;const p=new T.Vector3((u-.5)*g.width,(.5-v)*g.height,0);m.localToWorld(p);p.project(cam);const r=cvs.getBoundingClientRect();return[r.left+(p.x+1)/2*r.width,r.top+(1-p.y)/2*r.height]}};
}
