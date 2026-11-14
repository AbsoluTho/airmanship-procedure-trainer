"""End-to-end check of the MCDU exercise and the 3D cockpit.
Needs Python Playwright and Chrome. Run from the repository root: python3 tests/test_flow.py [url]
Without a url it serves the repository on http://127.0.0.1:8765/ and tests index.html and dist/index.html."""
import asyncio,sys,threading,http.server,functools,os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def serve():
    h=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT)
    h.log_message=lambda *a:None
    s=http.server.ThreadingHTTPServer(('127.0.0.1',8765),h);threading.Thread(target=s.serve_forever,daemon=True).start()
async def run(url,b):
    pg=await b.new_page(viewport={'width':1180,'height':820});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(url);await pg.wait_for_timeout(500)
    k=lambda x:pg.evaluate('k=>window.__press(k)',x)
    async def t(s):
        for ch in s: await k('SP' if ch==' ' else ch)
    # system message GPS PRIMARY (white) is shown while the scratchpad is empty and stays until CLR
    assert await pg.evaluate('FL.rate')==1,'simulation speed starts at x1'
    import re as _re;ver=_re.search(r'^## Status: .+? \((v[0-9.]+)\)',open(os.path.join(ROOT,'README.md')).read(),_re.M).group(1)
    assert (await pg.evaluate("document.querySelector('.appver').textContent")).startswith(ver+' '),'app version in the top right corner matches the README'
    assert await pg.evaluate("msgShown().t")=='GPS PRIMARY','GPS PRIMARY at power-up'
    await k('CLR');assert await pg.evaluate("msgShown()")==None,'CLR clears GPS PRIMARY'
    await t('OEJN/OETB');await k('R1')
    assert await pg.evaluate("window.__S().page")=='ROUTESEL','ROUTE selection after FROM/TO (company routes)';await k('L6')
    await t('OEMA');await k('L2');await t('TRN385');await k('L3');await t('20');await k('L5')
    await t('340/46');await k('L6')
    assert await pg.evaluate('window.__S().init.temp')==-46,'unsigned CRZ temp should be negative'
    await t('360');await k('R5');assert await pg.evaluate('window.__S().init.tropo')==36000,'3-digit TROPO'
    await k('FPLN');await k('L1');await k('L1');await k('L2');await k('DOWN');await k('DOWN');await k('L5');await k('R6')
    legs=await pg.evaluate('window.__S().active.legs.map(l=>l.id||"-")')
    await pg.evaluate(f'window.__S().fpOff={(await pg.evaluate("fplnRows(window.__S().active).map(r=>r.id||r.k)")).index("MIGDA")}');await k('L1');await k('R5')
    await t('L677');await k('L1');await t('V54');await k('L2');await t('TBK');await k('R2');await k('R6')
    await k('L6');await k('R1');await k('L3');await k('L5');await k('R6')
    legs=await pg.evaluate('window.__S().active.legs.map(l=>l.k)')
    await pg.evaluate(f'window.__S().fpOff={(await pg.evaluate("fplnRows(window.__S().active).map(r=>r.k)")).index("disc")-1}');await k('CLR');await k('L2');await k('R6')
    await k('INIT');await k('RIGHT');await t('58.4/27.5');await k('R1');await t('8.6');await k('R2')
    trip=await pg.evaluate('predict().trip.fuel');assert 3<trip<7,f'trip fuel {trip}'
    await k('PERF');await t('150');await k('L3');await t('146');await k('L2');await t('141');await k('L1')
    await t('1/UP0.4');await k('R3');await t('54');await k('R4')
    await t('160');await k('L1');assert await pg.evaluate('[msgShown().t,msgShown().a]')==['V1/VR/V2 DISAGREE',True],'V-speed order check (amber message)'
    await k('CLR');await t('141');await k('L1')
    await pg.evaluate("window.__efis('mode','PLAN')");await k('FPLN')
    on=await pg.evaluate("window.__efis('cstr');window.__efis('wpt');window.__efis('arpt');['cstr','wpt','vord','ndb','arpt'].filter(o=>window.__EFIS[o])")
    assert on==['arpt'],f'EFIS options must be one at a time: {on}'
    off=await pg.evaluate("window.__efis('arpt');['cstr','wpt','vord','ndb','arpt'].filter(o=>window.__EFIS[o])")
    assert off==[],f'pressing the lit option turns it off: {off}'
    legs=await pg.evaluate('window.__S().active.legs.map(l=>l.k)')
    await pg.evaluate(f'window.__S().fpOff={(await pg.evaluate("fplnRows(window.__S().active).map(r=>r.k)")).index("dest")-1}');await k('UP');await k('DOWN')
    # ---- part 2 pages (FlyByWire layouts) ----
    scr=lambda: pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ').replace(/\\s+/g,' ')")
    await k('INIT');await k('R3');x=await scr();assert 'IRS INIT' in x,('IRS INIT',x,await pg.evaluate('[window.__S().page,window.__S().msg,window.__S().sp]'))
    await k('L6');await k('R4');await t('270/20/FL100');await k('L1');assert await pg.evaluate('window.__S().wind.clb.length')==1,'CLIMB WIND entry'
    await k('R5');assert 'CRZ WIND' in await scr()
    await k('RADNAV');await t('TBK');await k('L1');assert await pg.evaluate('window.__S().rad.vor1.freq')==115.7,'VOR tuned by ident'
    assert 'ITBK/109.50' in await scr(),'LS autotuned from the approach, with its frequency'
    await k('FPLN');await pg.evaluate('window.__S().fpOff=0');await k('UP');await k('DOWN')
    assert await pg.evaluate("window.__S().active.legs[1].id")=='(426)','first SID leg: 400 ft AAL on runway track'
    await pg.evaluate("window.__S().sp='/+3000'");await k('R3');assert await pg.evaluate('JSON.stringify(window.__S().active.legs[2].alt)')=='{"t":"+","v":3000}','ALT CSTR from F-PLN'
    await k('R3');assert 'VERT REV' in await scr();await k('L6')
    await k('PERF');await k('R6');assert 'CLB' in await scr();await k('R6');await k('R6');await k('R6')
    assert 'QNH' in await scr(),'PERF APPR'
    await t('1013');await k('L1');await t('2750');await k('R2');assert await pg.evaluate('window.__S().p2.qnh')==1013
    await k('R6');assert 'GO AROUND' in await scr()
    await k('SECF');await k('L1');assert await pg.evaluate('!!window.__S().sec'),'SEC copy'
    await k('R1');assert 'SEC INIT' in await scr(),'SEC INIT A';await t('35');await k('L5')
    assert await pg.evaluate('[I().ci,window.__S().sec.data.init.ci]')==[20,35],'SEC INIT keeps its own cost index'
    await k('RIGHT');assert 'SEC INIT FUEL PRED' in await scr(),'SEC INIT B'
    await k('SECF');await k('R2');x=await scr();assert x.startswith(' SEC') or 'SEC' in x.split('  ')[0],('SEC PERF',x)
    await k('DATA');await k('L5');assert 'OEJN' in await scr(),'CLOSEST AIRPORTS'
    await k('DATA');await k('L4');assert 'ACTIVE NAV DATA BASE' in await scr()
    await k('DATA');await k('RIGHT');await k('L2');await t('JDW');await k('L1');assert 'VORTAC' in await scr(),'NAVAID page'
    # ---- pilot waypoints: NEW WAYPOINT (PLACE/BRG/DIST) and an LL entry in the F-PLN (temporary F-PLN, erased) ----
    await pg.evaluate("localStorage.removeItem('airmanship.stored.v1');window.__stored().wpts=[]")
    await k('DATA');await k('RIGHT');await k('R1');assert 'NEW WAYPOINT' in await scr(),'NEW WAYPOINT when none stored'
    await t('TBK/090/20');await k('L3');await k('R6');assert 'PBD01' in await scr(),'stored waypoint PBD01'
    await k('FPLN');await pg.evaluate("window.__S().fpOff=0");await t('N2830.0/E03700.0');await k('L2')
    assert await pg.evaluate("window.__S().tmpy.legs.some(l=>l.id==='LL01')&&!!DB.wpt.LL01"),'LL waypoint LL01 inserted from the F-PLN'
    await k('L6');assert await pg.evaluate("!window.__S().tmpy"),'temporary F-PLN erased'
    await k('FUEL');assert 'FUEL PRED' in await scr()
    await k('PROG');assert 'REC MAX' in await scr();await t('OETB');await k('R4');assert '°/' in await scr()
    await k('AIRPORT')
    await pg.evaluate(f'window.__S().fpOff={(await pg.evaluate("fplnRows(window.__S().active).map(r=>r.k)")).index("dest")-1}');await k('UP');await k('DOWN')   # OETB back at the PLAN centre
    await k('INIT');await k('RIGHT')
    done=await pg.evaluate("[...document.querySelectorAll('#tasks li.done')].length")
    assert done==14,f'exercise tasks done: {done}/14'
    alt_rows=await pg.evaluate("fplnRows(window.__S().active).map(r=>r.k).join(',')")
    assert 'altorig,altdisc,altn' in alt_rows,f'alternate F-PLN: destination, discontinuity, ALTN: {alt_rows}'
    # ALTN route: a waypoint typed on the discontinuity is inserted, CLR on the discontinuity joins DCT; CLR twice clears CLR at once
    r=await pg.evaluate("""(()=>{const R=fplnRows(S.active),i=R.findIndex(r=>r.k==='altdisc');S.page='FPLN';S.fpOff=i;S.sp='DEMSU';P.FPLN.lsk('L',1);
      const a=fplnRows(S.active).filter(r=>r.k.startsWith('alt')).map(r=>r.k+(r.id?':'+r.id:'')).join(' ');
      S.fpOff=fplnRows(S.active).findIndex(r=>r.k==='altdisc');S.sp='CLR';P.FPLN.lsk('L',1);const b=fplnRows(S.active).filter(r=>r.k.startsWith('alt')).map(r=>r.k).join(' ');
      S.sp='';clrKey();const c1=S.sp;clrKey();const c2=S.sp;I().altR={altn:I().altn,wpts:[],dct:false};S.fpOff=0;return[a,b,c1,c2]})()""")
    assert r==['altorig:OETB altwpt:DEMSU altdisc altn:OEMA','altorig altwpt altn','CLR',''],f'ALTN route and CLR: {r}'
    # ---- automatic flight, flown with the FCU ----
    assert 'FCU' in (await pg.evaluate('flightReady().join()')),'FCU altitude required before takeoff'
    await pg.evaluate("window.__FCU.alt=7000;window.__efis('ls')")
    assert await pg.evaluate('flightReady().length')==0,await pg.evaluate('flightReady()')
    # ---- SAVE SETUP once START is possible ----
    await pg.evaluate("localStorage.removeItem('airmanship.setup.v1')");await pg.click('[data-fl="setup:save"]')
    assert (await pg.evaluate("window.__setup.read()&&window.__setup.read().label"))=='OEJN/OETB 16C MIGD2E','setup saved'
    # ---- FIX INFO (LAT REV at the origin): ref fix, radial and radius; crossing of the route computed ----
    await pg.evaluate("window.__plan0=clone(window.__S().active);window.__S().fpOff=0");await k('FPLN');await k('L1');await k('R1')
    assert 'FIX INFO' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')"),'FIX INFO page from LAT REV at the origin'
    await t('JDW');await k('L1');await t('90');await k('L2');await t('20');await k('L4')
    fx=await pg.evaluate("(()=>{const f=window.__S().fix[0],h=fixHits(f);return[f.id,f.rad[0],f.radius,h.rad[0]!=null,h.radius!=null]})()")
    assert fx==['JDW',90,20,True,True],f'FIX INFO entries and route crossings: {fx}'
    pw=await pg.evaluate("fplnRows(window.__S().active).filter(r=>r.k==='pw').map(r=>r.id)")
    assert pw==['(T/C)','(T/D)','(DECEL)'],f'pseudo waypoints on the F-PLN: {pw}'
    await k('FPLN')
    # ---- ECAM behind the MCDU ----
    await pg.click('#duToggle');assert await pg.evaluate("document.querySelector('#mcduHome').classList.contains('ecam-on')&&getComputedStyle(document.querySelector('#mcdu')).display==='none'"),'ECAM replaces the MCDU'
    assert await pg.evaluate("window.__ecam.page()")=='wheel','SD on the ground: WHEEL'
    await pg.click('[data-ecp="fuel"]');assert await pg.evaluate("window.__ecam.page()")=='fuel','SD FUEL key'
    await pg.click('[data-ecp="fuel"]');assert await pg.evaluate("window.__ecam.page()")=='wheel','second press: back to the automatic page'
    for key in ['eng','bleed','press','elec','hyd','apu','cond','door','fctl','sts','all','rcl','emer']: await pg.click(f'[data-ecp="{key}"]')
    # every SD page ported from FlyByWire renders over the screen with its title (ground: EXT PWR and APU on)
    SDCHK="""(()=>{const T={eng:'ENGINE',crz:'CRUISE',wheel:'WHEEL',fuel:'FUEL',door:'DOOR/OXY',fctl:'F/CTL',bleed:'BLEED',press:'CAB PRESS',elec:'ELEC',hyd:'HYD',apu:'APU',cond:'COND',sts:'STATUS'},bad=[];
      for(const g of Object.keys(T)){if(!window.SDP_PORTED.includes(g)){bad.push(g+' not ported');continue}window.__EC.page=g;drawEcam();const o=document.querySelector('#sdsvg');
        if(!o.textContent.includes(T[g])||o.querySelectorAll('text,path,line').length<3)bad.push(g)}window.__EC.page=null;drawEcam();return bad})()"""
    await pg.evaluate("Object.assign(window.__S().elec,{bat1:true,bat2:true,ext:true,apu:true})")
    bad=await pg.evaluate(SDCHK);assert bad==[],f'SD pages on the ground: {bad}'
    assert await pg.evaluate("(window.__EC.page='apu',drawEcam(),document.querySelector('#sdsvg').textContent.includes('AVAIL'))"),'APU AVAIL with the APU MASTER SW on the ground'
    assert await pg.evaluate("(window.__EC.page='elec',drawEcam(),document.querySelector('#sdsvg').textContent.includes('EXT PWR'))"),'EXT PWR shown on the ELEC page'
    assert await pg.evaluate("(window.__EC.page='sts',drawEcam(),document.querySelector('#sdsvg').textContent.includes('NORMAL'))"),'STATUS NORMAL'
    await pg.evaluate("Object.assign(window.__S().elec,{ext:false,apu:false});window.__EC.page=null")
    await pg.click('[data-ecp="clr"]');await pg.click('[data-ecp="tocfg"]');assert await pg.evaluate('window.__EC.toCfg'),'T.O CONFIG test'
    assert await pg.evaluate("!document.querySelector('#ecp').hidden"),'ECAM control panel shown over the ND with the ECAM'
    await pg.click('#duToggle');assert not await pg.evaluate("window.__EC.on"),'MCDU button returns to the MCDU'
    assert await pg.evaluate("document.querySelector('#ecp').hidden"),'control panel hidden with the MCDU'
    await pg.click('#ecpBtn');assert await pg.evaluate("!document.querySelector('#ecp').hidden"),'ND button shows the control panel with the MCDU'
    await pg.click('#ecpBtn');assert await pg.evaluate("document.querySelector('#ecp').hidden"),'ND button hides it again'
    await pg.evaluate("window.__ecam.show(true)")
    # descent constraints for the flight: SPD 220 and AT OR BELOW 7000 at D179O (DES then flies level at 7000)
    await pg.evaluate("(()=>{const l=window.__S().active.legs.find(l=>l.id==='D179O');l.spd=220;l.alt={t:'-',v:7000}})()")
    await pg.evaluate("window.__flight('pm:on')")   # test pilot monitoring moves the levers
    await pg.evaluate("window.__flight('start')")
    seen=await pg.evaluate("""(()=>{const seen=new Set(),log=[];let n=0,did={};const add=()=>{const f=FL.fma;[f.c1,f.c2,f.c3,f.c4].forEach(c=>(c||[]).forEach(x=>x&&x[0]&&seen.add(x[0])));if(f.land)seen.add(f.land);seen.add('PH:'+S.phase);seen.add('LAT:'+FL.lat);seen.add('VER:'+FL.ver)};
      while(FL.stage!=='STOP'&&n<60000){step(0.5);setFma();add();n++;const dtg=FL.path.sThr-FL.s;
        if(n%25===0){drawEcam();seen.add('SD:'+window.__ecam.page())}
        if(!did.sdc&&S.phase==='CRZ'){did.sdc=1;const pg0=window.__EC.page;let ok=true;for(const g of window.SDP_PORTED){window.__EC.page=g;drawEcam();if(document.querySelector('#sdsvg').querySelectorAll('text,line,path').length<3)ok=false}window.__EC.page=pg0;if(ok)seen.add('SD PAGES IN CRZ')}
        if(FL.stage==='ROLL'&&FL.acc>2)seen.add('TREND TAKEOFF');if(FL.stage==='ROLLOUT'&&FL.acc<-2)seen.add('TREND LANDING');
        if(S.phase==='CLB'&&FL.spdIsMach&&FL.alt>25000){seen.add('MACH IN CLB');did.mclb=1}
        if(did.mclb&&S.phase==='DES'&&!FL.spdIsMach&&FL.alt<30000)seen.add('SPEED IN DES');
        if(!did.ap&&FL.alt-groundElev()>1200){fcuButton('ap1');did.ap=1}
        if(FL.stage==='ROLLOUT'){if(LV.decel)seen.add('AUTOBRAKE DECEL');if(LV.thr==='REVMAX')seen.add('MAX REV')}
        /* DIR TO 80 deg left of the track: one left turn onto the waypoint, within 0.5 NM of the path, no right turn back */
        if(did.dt&&!did.dtok){const d=((FL.trkT-did.dt.trk+540)%360)-180;if(d>1)did.dt.right=1;did.dt.trk=FL.trkT;did.dt.xtk=Math.max(did.dt.xtk,Math.abs(FL.xtk||0));
          if(FL.t-did.dt.t>240){if(!did.dt.right&&did.dt.xtk<0.5)seen.add('DIR TO NO OVERSHOOT');else seen.add('DIRTO right='+did.dt.right+' xtk='+did.dt.xtk.toFixed(2));did.dtok=1}}
        if(FL.stage==='AIR'&&!did.navTo){const h=FL.alt-groundElev();if(h>50&&h<380&&FL.lat==='RWY TRK'&&FL.latArm==='NAV')seen.add('RWY TRK AIRBORNE');if(FL.lat==='NAV'){if(h>=395)seen.add('NAV FROM 400');did.navTo=1}}
        if(did.des&&!did.early&&S.phase==='CRZ'&&FL.ver==='DES'&&FL.s<FL.td-5&&Math.abs(FL.vs+1000)<60){seen.add('EARLY DES 1000');did.early=1}
        if(did.early&&!did.joined&&FL.ver==='DES'&&FL.vs<-1500&&Math.abs(FL.alt-profileAlt(dtg))<300){seen.add('PATH JOINED');did.joined=1}
        if(!did.lvl&&FL.ver==='ALT'&&Math.abs(FL.alt-7000)<30){seen.add('LEVEL7000');FCU.alt=34000;fcuPush('alt',false);did.lvl=1}
        if(!did.lvl&&FL.ver==='ALT CST'&&Math.abs(FL.alt-7000)<30){seen.add('LEVEL7000');did.lvl=1}
        if(!did.hdg&&FL.alt>20000){FCU.hdgPre=null;fcuPush('hdg',true);FCU.hdg=((Math.round(FL.trkT-3)+30)%360)||360;did.hdg=FL.t}
        if(did.hdg&&!did.nav&&FL.t-did.hdg>90){FCU.hdg=((Math.round(FL.trkT-3)-60+360)%360)||360;fcuPush('hdg',false);did.nav=FL.t}
        if(did.nav&&!did.navok&&FL.lat==='NAV'){seen.add('NAV REJOINED');did.navok=1}
        if(did.navok&&!did.dir&&S.phase==='CRZ'&&FL.fromIx>3){const L=dirList();const tgt=L.find(x=>x.l.id==='WEJ');if(tgt){FL.trkT=(brg(FL.pos,DB.wpt.WEJ)+80)%360;directTo('WEJ');P.DIR.lsk('R',6);did.dir=1;did.dt={t:FL.t,trk:FL.trkT,right:0,xtk:0};
          if(S.active.legs.some(l=>l.k==='tp')&&FL.lat==='NAV')seen.add('DIR TO INSERTED')}}
        if(did.dir&&!did.dirok){step(0.5);if(FL.path.pts[0].ix!=null&&S.active.legs[FL.path.pts[0].ix].k==='tp')seen.add('PATH FROM T-P');did.dirok=1}
        if(did.dirok&&!did.seq&&FL.fromIx>0){const r=fplnRows(S.active);if(r[0].ix===FL.fromIx)seen.add('FROM LINE SEQUENCED');did.seq=1}
        if(!did.qnh&&FL.alt>14000){if(EFIS.std===false)seen.add('QNH ABOVE TA');fcuPush('baro',true);if(EFIS.std)seen.add('STD SET');did.qnh=1}
        if(!did.crzpg&&S.phase==='CRZ'){S.page='PERFCRZ';render();const t=[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ');if(t.includes('T/D'))seen.add('PERF CRZ T/D');did.crzpg=1}
        if(!did.des&&FL.s>FL.td-40&&S.phase==='CRZ'){FCU.alt=4200;fcuPush('alt',false);did.des=1}
        if(did.des&&!did.q2&&FL.alt<12000){fcuPush('baro',false);did.q2=1}
        if(!did.c1&&FL.conf==='1'&&S.phase==='APPR'){const d=FL.path.sThr-FL.s;if(d<=12.2&&d>11)seen.add('CONF1 AT 12NM');did.c1=1}
        if(!did.c2&&FL.conf==='2'&&S.phase==='APPR'){const d=FL.path.sThr-FL.s;if(d<=8.2&&d>7)seen.add('CONF2 AT 8NM');did.c2=1}
        if(!did.de&&S.phase==='APPR'){const d=FL.path.sThr-FL.s;if(d<=25.2&&d>24)seen.add('APPR AT DECEL');did.de=1}
        if(!did.gr&&FL.gear&&S.phase==='APPR'){const d=FL.path.sThr-FL.s;if(d<=6.2&&d>5.5)seen.add('GEAR AT 6NM');did.gr=FL.t}
        if(did.gr&&!did.f3&&FL.conf==='3'){if(Math.abs(FL.t-did.gr-5)<=1)seen.add('CONF3 5S AFTER GEAR');did.f3=FL.t}
        if(did.f3&&!did.ff&&FL.conf==='FULL'){if(Math.abs(FL.t-did.f3-3)<=1)seen.add('FULL 3S AFTER CONF3');did.ff=1}
        if(!did.appr&&dtg<28){fcuButton('appr');fcuButton('ap2');did.appr=1}
        /* constraints: SPD 210 up to JN240, AT OR BELOW 7000 until ORPAR (ALT CST, then CLB again), ALT armed in magenta */
        const ixOf=id=>S.active.legs.findIndex(l=>l.id===id);
        if(S.phase==='CLB'&&FL.fromIx<ixOf('JN240')&&FL.alt-groundElev()>1200&&FL.spdT<=211)seen.add('SPD CST 210');
        if(FL.fma.c2&&FL.fma.c2[1]&&FL.fma.c2[1][1]==='m')seen.add('ALT ARMED MAGENTA');
        if(FL.ver==='ALT CST'){did.cst=1;if(Math.abs(FL.alt-7000)<30&&FL.fromIx<ixOf('ORPAR'))seen.add('ALT CST 7000')}
        if(did.cst&&FL.ver==='CLB'&&FL.fromIx>=ixOf('ORPAR'))seen.add('CLB AFTER ORPAR');
        if(!did.d136&&FL.fromIx>=ixOf('MUPVA')){if(FL.alt<=7000)seen.add('BELOW 7000 AFTER D179O');did.d136=1}
        if(FL.fromIx>=ixOf('D179O'))did.d179=1;
        if(did.d179&&S.phase==='DES'&&FL.spdT<=221)seen.add('SPD CST 220 DES');
        if(!did.lvl6&&FL.ver==='DES'&&Math.abs(FL.vs)<60&&Math.abs(FL.alt-7000)<40)seen.add('DES LEVEL AT CSTR'),did.lvl6=1;
        if(!did.pr&&S.phase==='CLB'&&FL.alt>8000){const v=vPredict(),q=v&&v.wp[ixOf('RIBIL')];if(q&&q.met)seen.add('RIBIL PREDICTED MET');did.pr=1}}
      seen.add('END:'+FL.stage);return[...seen]})()""")
    for m in ['AUTOBRAKE DECEL','MAX REV','DIR TO NO OVERSHOOT','RWY TRK AIRBORNE','NAV FROM 400','EARLY DES 1000','PATH JOINED','APPR AT DECEL','GEAR AT 6NM','CONF3 5S AFTER GEAR','FULL 3S AFTER CONF3','SD PAGES IN CRZ','TREND TAKEOFF','TREND LANDING','MACH IN CLB','SPEED IN DES','SD:eng','SD:crz','SD:wheel','SPD CST 210','ALT CST','ALT CST 7000','CLB AFTER ORPAR','ALT ARMED MAGENTA','RIBIL PREDICTED MET','BELOW 7000 AFTER D179O','SPD CST 220 DES','DES LEVEL AT CSTR','DIR TO INSERTED','PATH FROM T-P','FROM LINE SEQUENCED','QNH ABOVE TA','STD SET','PERF CRZ T/D','CONF1 AT 12NM','CONF2 AT 8NM','MAN','SRS','RWY','NAV','THR CLB','CLB','LEVEL7000','ALT','ALT CRZ','HDG','NAV REJOINED','DES','THR IDLE','LOC *','LOC','G/S*','G/S','CAT 3','DUAL','LAND','FLARE','RETARD','ROLL OUT','PH:CLB','PH:CRZ','PH:DES','PH:APPR','PH:DONE','END:STOP']:
        assert m in seen,f'never seen in the flight: {m}  (seen: {sorted(seen)})'
    await pg.evaluate("window.__flight('reset');window.__ecam.show(false)")
    # ---- LOAD SETUP after a flight: back to the saved set-up, ready for START ----
    await pg.evaluate("I().ci=99;window.__S().active.legs.splice(3,2);FCU.alt=2000");await pg.click('[data-fl="setup:load"]')
    r=await pg.evaluate("[I().ci,flightReady().length,window.__S().active.sid,FCU.alt>3000,window.__S().page,FL.active]")
    assert r==[20,0,'MIGD2E',True,'FPLN',False],f'setup loaded, ready for START: {r}'
    # ---- second flight: OPEN CLB logic and selected SPD to MACH ----
    r=await pg.evaluate("""(()=>{FCU.alt=7000;FCU.spdMgd=true;FCU.mach=false;window.__flight('start');const out={};let n=0,d={};
      while(FL.stage!=='STOP'&&n<12000){step(0.5);setFma();n++;
        if(!d.ap&&FL.alt-groundElev()>1200){fcuButton('ap1');d.ap=1}
        if(!d.sm&&FL.ver==='ALT'&&Math.abs(FL.alt-7000)<30){FCU.alt=7800;fcuPush('alt',true);d.sm=FL.t}
        if(d.sm&&!d.smv&&FL.t-d.sm>20&&FL.ver==='OP CLB'){out.small=Math.round(FL.vs);d.smv=1}
        if(d.smv&&!d.big&&FL.ver==='ALT'){FCU.spd=300;FCU.spdMgd=false;FCU.mach=false;FCU.alt=34000;fcuPush('alt',true);d.big=FL.t}
        if(d.big&&!d.bigv&&Math.abs(FL.ias-300)<3){out.acc=Math.round(FL.t-d.big);out.big=Math.round(FL.vs);out.fma=FL.fma.c1[0][0]+'/'+FL.fma.c2[0][0];d.bigv=1}
        if(d.big&&FCU.mach){out.mach=[FCU.spd,Math.round(FL.alt)];break}}
      window.__flight('reset');FCU.spdMgd=true;FCU.mach=false;return out})()""")
    assert r.get('small') is not None and 900<=r['small']<=1100,f'OP CLB under 1200 ft: V/S 1000 ({r})'
    assert r.get('big',0)>1500 and r.get('fma')=='THR CLB/OP CLB',f'OP CLB: climb thrust, speed on elevator ({r})'
    assert r.get('mach') and abs(r['mach'][0]-0.78)<0.03 and 25000<r['mach'][1]<33000,f'selected SPD to MACH at the crossover ({r})'
    # ---- third flight: HOLD at LABUN (flown, IMM EXIT), OFFSET R10 in cruise, NEW DEST ----
    P=lambda x:pg.evaluate('k=>window.__press(k)',x)
    await pg.evaluate("window.__S().active=clone(window.__plan0);window.__S().tmpy=null;window.__S().sp='';window.__S().msg=null;FCU.alt=34000")
    ix=await pg.evaluate("fplnRows(window.__S().active).findIndex(r=>r.id==='LABUN')");await pg.evaluate(f"window.__S().fpOff={ix}");await P('FPLN');await pg.evaluate(f"window.__S().fpOff={ix}")
    await P('L1');await P('L3');assert await pg.evaluate("window.__S().page==='HOLD'&&!!window.__S().tmpy"),'HOLD page with a temporary F-PLN'
    await P('R6');h=await pg.evaluate("(()=>{const L=window.__S().active.legs,i=L.findIndex(l=>l.id==='LABUN');return[L[i+1].k,L[i+1].fix,L[i+1].type]})()")
    assert h==['hold','LABUN','COMPUTED'],f'computed hold inserted after LABUN: {h}'
    nd=await pg.evaluate("""(()=>{const S0=clone(S.active);S.sec=clone(S.active);S.secMode=true;const i=S.sec.legs.findIndex(l=>l.id==='LABUN');S.lr=i;S.page='LATREV';S.sp='OEJN';P.LATREV.lsk('R',4);
      const d=S.sec.legs[idxK(S.sec,'dest')].id,b=S.sec.legs[idxK(S.sec,'dest')-1].k;S.secMode=false;S.sec=null;S.active=S0;return[d,b,S.msg]})()""")
    assert nd[:2]==['OEJN','disc'],f'NEW DEST to the origin (return plan) from SEC LAT REV: {nd}'
    aw=await pg.evaluate("""(()=>{const S0=clone(S.active);S.sec=clone(S.active);S.secMode=true;S.page='FPLN';const R=fplnRows(S.sec);S.fpOff=R.findIndex(r=>r.id==='NETOL');S.sp='OEJN';P.FPLN.lsk('L',1);
      const ix=S.sec.legs.findIndex(l=>l.k==='wpt'&&l.id==='OEJN'),pos=DB.wpt.OEJN,r0=Object.values(DB.apt.OEJN.rwy)[0].pos;S.lr=ix;S.page='LATREV';render();
      const arr=[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ').includes('ARRIVAL>');P.LATREV.lsk('R',1);
      const d=S.sec.legs[idxK(S.sec,'dest')].id,pg=S.page,last=S.sec.legs[S.sec.legs.length-1].k;S.secMode=false;S.sec=null;S.active=S0;S.page='FPLN';return[ix>0,pos[0]===r0[0],arr,d,pg,last]})()""")
    assert aw==[True,True,True,'OEJN','ARR','dest'],f'airport as a waypoint (first runway threshold), ARRIVAL> makes it the destination: {aw}'
    th=await pg.evaluate("""(()=>{const q=S.perf,f0=q.flaps,t0=q.ths,out=[];S.page='PERFTO';for(const v of['1/.4UP','2/UP.4','/1.2DN','3/0.4UP']){S.sp=v;P.PERFTO.lsk('R',3);out.push(q.flaps+'/'+q.ths)}
      q.flaps=f0;q.ths=t0;const v0=[q.v1,q.vr,q.v2];q.v1=q.vr=q.v2=null;const rd=flightReady().some(m=>/V1/.test(m));vFill();const v1=[q.v1,q.vr,q.v2];[q.v1,q.vr,q.v2]=v0;S.sp='';return[out,rd,v1.every(x=>x>100)]})()""")
    assert th==[['1/UP0.4','2/UP0.4','2/DN1.2','3/UP0.4'],False,True],f'THS formats; V speeds not required for START (computed when blank): {th}'
    pf=await pg.evaluate("(()=>{const fd=EFIS.fd;EFIS.fd=true;drawPFD2D();const ok=!flying()&&S.fuel.zfw!=null;EFIS.fd=fd;return ok})()")
    assert pf,'pre-flight FMA conditions (INIT B, FD)'
    vs=await pg.evaluate("(()=>{const o=[];const v0=[FL.ver,FCU.vsVal,FL.stage,FCU.ap1];FL.stage='AIR';FCU.ap1=true;for(const v of[1500,-500,0]){FL.ver='V/S';FCU.vsVal=v;setFma();o.push(FL.fma.c2[0][0])}[FL.ver,FCU.vsVal,FL.stage,FCU.ap1]=v0;setFma();return o})()")
    assert vs==['V/S +1500','V/S -500','V/S 0'],f'FMA V/S value: {vs}'
    fk=await pg.evaluate("(()=>{S.page='FPLN';S.fpOff=6;press('FPLN');return S.fpOff})()")
    assert fk==0,f'F-PLN key shows the F-PLN from the top: {fk}'
    h2=await pg.evaluate("(()=>{const L=window.__S().active.legs,i=L.findIndex(l=>l.k==='hold');return[L[i+1].k+':'+L[i+1].id,L[i+2].k]})()")
    assert h2==['wpt:LABUN','disc'],f'after the hold: the fix repeated, then a discontinuity: {h2}'
    r=await pg.evaluate("""(()=>{window.__flight('start');let n=0,ap=0,o={loops:0};while(FL.stage!=='STOP'&&n<40000){step(0.5);n++;if(n%10===0)setFma();
        if(!ap&&FL.alt-groundElev()>1200){fcuButton('ap1');ap=1}if(FL.ver==='ALT'&&FL.alt<8000){FCU.alt=34000;fcuPush('alt',false)}
        if(FL.inHold!=null&&o.t0==null){o.t0=FL.t;o.s=FL.s}
        if(o.t0!=null&&!o.exit){if(FL.s<o.s-1)o.loops++;o.s=FL.s;if(FL.t-o.t0>150&&o.ias==null){o.ias=Math.round(FL.ias);o.hs=holdSpd()}
          if(o.loops>=2){S.page='FPLN';const rows=fplnRows(S.active);S.fpOff=rows.findIndex(r=>r.k==='hold');window.__press('R1');o.exit=FL.holdExit!=null}}
        if(o.exit&&FL.inHold==null&&o.out==null){const l=S.active.legs[FL.fromIx];o.out=l.k+':'+(l.id||l.fix)}
        if(o.out&&S.phase==='CRZ'&&S.active.legs[FL.fromIx].k==='wpt')break}
      return o})()""")
    assert r.get('loops',0)>=2 and r.get('exit') and r.get('out')in('hold:LABUN','wpt:LABUN'),f'hold flown twice, IMM EXIT, hold sequenced: {r}'
    assert r.get('ias') and abs(r['ias']-r['hs'])<=8,f'managed speed in the hold is the hold speed: {r}'
    await pg.evaluate("window.__S().sp='';window.__S().fpOff=0");await P('FPLN');await pg.evaluate("window.__S().fpOff=0");await P('L1')
    for ch in 'R10': await P(ch)
    await P('L2');await P('R6');assert await pg.evaluate("JSON.stringify([window.__S().active.ofst.side,window.__S().active.ofst.nm])")=='["R",10]','OFFSET R10 inserted'
    x=await pg.evaluate("""(()=>{const P0=buildPath(Object.assign(clone(S.active),{ofst:undefined}));for(let n=0;n<700;n++)step(0.5);return project(P0,FL.pos,1,P0.pts.length-1).xtk})()""")
    assert 9<x<11,f'aircraft 10 NM right of the route: {x}'
    await pg.evaluate("window.__S().sp='';window.__S().fpOff=0");await P('FPLN');await pg.evaluate("window.__S().fpOff=0")
    n=await pg.evaluate("(()=>{const R=fplnRows(S.active);for(let n=2;n<6;n++)if(R[n-1]&&R[n-1].k==='wpt')return n})()");await P('L'+str(n))   # first waypoint below the FROM line
    for ch in 'OEMA': await P(ch)
    await P('R4');await P('R6')
    r=await pg.evaluate("(()=>{for(let n=0;n<200;n++)step(0.5);const L=S.active.legs;return[L[idxK(S.active,'dest')].id,I().to,L[idxK(S.active,'dest')-1].k,!!S.active.ofst]})()")
    assert r==['OEMA','OEMA','disc',False],f'NEW DEST OEMA after a discontinuity, offset removed: {r}'
    await pg.evaluate("window.__flight('reset');window.__S().active=clone(window.__plan0)")
    # ---- fourth flight: STEP ALTS (step climb at LABUN), RTA at TBK, engine failure (EO), VDEV on PROG ----
    await pg.evaluate("window.__S().active=clone(window.__plan0);window.__S().tmpy=null;window.__S().sp='';window.__S().msg=null;FCU.alt=34000;window.__S().rta=null")
    await P('PERF');await P('R6');await P('R6');await P('R5');assert 'STEP ALTS' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')"),'STEP ALTS from PERF CRZ'
    for ch in '360/LABUN': await P(ch)
    await P('L1');assert await pg.evaluate("window.__S().active.legs.find(l=>l.id==='LABUN').step")==36000,'step FL360 at LABUN'
    r=await pg.evaluate("""(()=>{window.__flight('start');let n=0,ap=0,o={};while(FL.stage!=='STOP'&&n<40000){step(0.5);n++;if(n%10===0)setFma();
        if(!ap&&FL.alt-groundElev()>1200){fcuButton('ap1');ap=1}if(FL.ver==='ALT'&&FL.alt<8000){FCU.alt=34000;fcuPush('alt',false)}
        if(S.phase==='CRZ'&&!o.f){FCU.alt=36000;o.f=1}if(n%10===0)msgTick();if(hasMsg('STEP AHEAD'))o.ahead=1;
        if(o.f&&FL.ver==='CLB'&&!o.at)o.at=S.active.legs[FL.fromIx].id;if(o.at&&FL.ver==='ALT'&&Math.abs(FL.alt-36000)<30)break}
      return{at:o.at,ahead:!!o.ahead,crz:I().crz,left:S.active.legs.some(l=>l.step!=null),alt:Math.round(FL.alt)}})()""")
    assert r=={'at':'LABUN','ahead':True,'crz':360,'left':False,'alt':36000},f'step climb at LABUN to FL360: {r}'
    # DIR TO with the keys: the key beside a waypoint of the list selects that waypoint
    await P('DIR');i=await pg.evaluate("dirList().findIndex(x=>x.l.id==='TBK')");assert 0<=i<4,i
    await P('L'+str(3+i));assert await pg.evaluate("window.__S().dirTo")=='TBK','DIR TO: the key beside TBK selects TBK'
    await P('L6');assert await pg.evaluate("!window.__S().tmpy"),'DIR TO erased'
    tgt=await pg.evaluate("(()=>{S.rta={id:'TBK',t:0};const g=rtaGeo(),t=nowUtcS()+g.d/(0.76*sos(FL.alt))*3600;S.rta=null;return hms(t).replace(/:/g,'')})()")
    rows=await pg.evaluate("fplnRows(window.__S().active).map(r=>r.id||r.k)");await P('FPLN');await pg.evaluate(f"window.__S().fpOff={rows.index('TBK')-1}");await P('R2');await P('R2')
    for ch in tgt: await P(ch)
    await P('R1');r=await pg.evaluate("(()=>{for(let n=0;n<1400;n++)step(0.5);const g=rtaGeo();return[S.rta.id,Math.round(g.err),Math.round(FL.mach*100)/100]})()")
    assert r[0]=='TBK' and abs(r[1])<30 and 0.72<=r[2]<=0.80,f'RTA at TBK met by the managed Mach: {r}'
    await pg.evaluate("window.__S().rta=null;window.__flight('eng:2')");r=await pg.evaluate("(()=>{for(let n=0;n<400;n++)step(0.5);return[S.eo,Math.round(FL.ias),cfgSpeeds().GD,sdPageSvg('hyd').includes('>LO<'),sdPageSvg('elec').includes('GEN</text>')]})()")
    assert r[0] and abs(r[1]-r[2])<=5 and r[3] and r[4],f'engine 2 failure: EO condition, green dot, SD pages: {r}'
    await P('PERF');assert 'CLR*' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')"),'EO CLR* on PERF CRZ'
    await P('R1');assert not await pg.evaluate('window.__S().eo'),'EO CLR* clears the EO condition'
    await pg.evaluate("window.__flight('eng:2');FCU.alt=7000;fcuPush('alt',false);(()=>{let n=0;while(S.phase!=='DES'&&n<20000){step(0.5);setFma();n++}for(let i=0;i<100;i++)step(0.5)})()")
    await P('PROG');assert 'VDEV=' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')"),'VDEV on PROG in descent'
    await pg.evaluate("window.__flight('reset');window.__S().active=clone(window.__plan0)")
    # ---- fifth flight: go-around at 500 ft, missed approach and hold, second approach and landing ----
    await pg.evaluate("window.__S().active=clone(window.__plan0);window.__S().tmpy=null;window.__S().sp='';window.__S().msg=null;FCU.alt=34000;FCU.appr=false;FCU.hdgMgd=true;FCU.spdMgd=true;I().crz=340")
    r=await pg.evaluate("""(()=>{window.__flight('start');let n=0,ap=0,o={};while(FL.stage!=='STOP'&&n<60000){step(0.5);if(n%10===0)setFma();n++;
        if(!ap&&FL.alt-groundElev()>1200){fcuButton('ap1');ap=1}if(FL.ver==='ALT'&&FL.alt<8000&&!o.d){FCU.alt=34000;fcuPush('alt',false)}
        if(S.phase==='CRZ'&&!o.d&&FL.s>FL.td-30){FCU.alt=7000;fcuPush('alt',false);o.d=1}
        if(S.phase==='APPR'&&FL.path.sThr-FL.s<20)FCU.appr=true;if(FL.ver==='G/S'&&!o.g){FCU.alt=6000;o.g=1}if(o.g&&FL.alt-groundElev()<500)break}
      window.__flight('ga');setFma();return[FL.fma.c1.map(x=>x&&x[0]).join(' '),FL.fma.c2[0][0],FL.lat,S.phase,FL.conf]})()""")
    assert r==['MAN TOGA','SRS','GA TRK','GA','3'],f'go-around: MAN TOGA, SRS, GA TRK, GA phase, flaps one step up: {r}'
    assert await pg.evaluate("(()=>{for(let i=0;i<4;i++)step(0.5);return FL.lat})()")=='NAV','NAV on the missed approach above 100 ft'
    rows=await pg.evaluate("fplnRows(window.__S().active).filter(r=>r.ix>=FL.fromIx).map(r=>r.id||r.k).slice(0,7).join(' ')")
    assert rows=='T-P TBK MUPVA HOLD R disc D179O MUPVA',f'missed approach active, approach strung again: {rows}'
    r=await pg.evaluate("""(()=>{let n=0;while(n<6000&&FL.inHold==null){step(0.5);n++}return[FL.inHold!=null,Math.round(FL.alt),FL.conf,FL.gear,S.active.legs[FL.fromIx].id]})()""")
    assert r[0] and abs(r[1]-6000)<60 and r[2]=='0' and r[3] is False and r[4]=='MUPVA',f'missed approach flown to the hold at MUPVA, 6000 ft, clean: {r}'
    await pg.evaluate("window.__S().fpOff=0");await P('FPLN');await pg.evaluate("window.__S().fpOff=0");await P('R2');assert await pg.evaluate('FL.holdExit!=null'),'IMM EXIT'
    await P('PERF');await P('L6');await P('L6');assert await pg.evaluate("window.__S().phase")=='APPR','ACTIVATE APPR PHASE from PERF GO AROUND'
    r=await pg.evaluate("""(()=>{let n=0,land=false;while(FL.stage!=='STOP'&&n<20000){step(0.5);n++;if(FL.path.sThr-FL.s<20)FCU.appr=true;if(FL.ver==='LAND')land=true}return[FL.stage,land,S.phase]})()""")
    assert r==['STOP',True,'DONE'],f'second approach flown to a landing: {r}'
    await pg.evaluate("window.__flight('reset');window.__S().active=clone(window.__plan0)")
    # ---- LEVERS (no pilot monitoring): take-off by the thrust levers, LVR CLB until CL, gear left down halves the climb, VFE limit ----
    r=await pg.evaluate("""(()=>{const fly=(gearUp)=>{window.__flight('reset');window.__flight('pm:off');S.active=clone(window.__plan0);S.tmpy=null;FCU.alt=7000;FCU.hdgMgd=true;FCU.spdMgd=true;
        lever('flaps',1);window.__flight('start');const o={};for(let n=0;n<40;n++)step(0.5);o.lineup=[FL.stage,FL.ias];lever('thr','N50');for(let n=0;n<10;n++)step(0.5);
        o.n1=Math.round(engStep()[0].n1);lever('thr','FLX');let n=0;while(FL.stage!=='AIR'&&n<400){step(0.5);n++}const t0=FL.t,a0=FL.alt;
        while(FL.t-t0<25){step(0.5);if(gearUp&&FL.alt-groundElev()>50&&LV.gear==='DOWN')lever('gear','UP')}o.climb=FL.alt-a0;
        while(FL.alt-groundElev()<2500)step(0.5);o.thr=FL.thr;lever('thr','CL');step(0.5);o.thr2=FL.thr;
        n=0;while(n<500){step(0.5);n++}o.ias=Math.round(FL.ias);o.conf=FL.conf;o.gear=FL.gear;return o};
      const a=fly(false),b=fly(true);
      /* immediate return: COPY ACTIVE, NEW DEST at the FROM waypoint = origin, ACTIVATE SEC in flight */
      S.sec=clone(S.active);S.secMode=true;S.lr=FL.fromIx;S.page='LATREV';S.sp='OEJN';P.LATREV.lsk('R',4);S.secMode=false;S.page='SECIDX';P.SECIDX.lsk('L',4);
      const ret=[S.active.legs[idxK(S.active,'dest')].id,I().to];directTo('OEJN');P.DIR.lsk('R',6);step(0.5);
      const dt=S.active.legs.filter(l=>l.k==='tp'||l.k==='dest').map(l=>l.k).join();window.__flight('reset');window.__flight('pm:on');S.active=clone(window.__plan0);FCU.alt=34000;return{a,b,ret,dt}})()""")
    # ---- engine start on the ground: MODE IGN START, MASTER 2 then 1; MASTER ON in NORM does not start; MASTER OFF shuts down ----
    e=await pg.evaluate("""(()=>{window.__flight('reset');const E=window.__eng;E.init(0,false);E.init(1,false);LV.m1=LV.m2=false;E.mode('NORM');
      lever('master',2);for(let i=0;i<20;i++)E.tick(0.5);const norm=E.ENG.e[1].st;lever('master',2);E.tick(0.5);
      E.mode('IGN');lever('master',2);let lit=null,peak=0;for(let i=0;i<200&&E.ENG.e[1].st!=='run';i++){E.tick(0.5);const x=E.ENG.e[1];if(lit==null&&x.ff>0)lit=Math.round(x.n2);peak=Math.max(peak,x.egt)}
      const t2=E.ENG.e[1].st,v=engStep()[1];lever('master',1);for(let i=0;i<200&&E.ENG.e[0].st!=='run';i++)E.tick(0.5);const t1=E.ENG.e[0].st;E.mode('NORM');
      lever('master',1);for(let i=0;i<120;i++)E.tick(0.5);const off=E.ENG.e[0].st;lever('master',1);E.mode('IGN');for(let i=0;i<200;i++)E.tick(0.5);E.mode('NORM');
      return[norm,lit,Math.round(peak),t2,Math.round(v.n2),t1,off,E.ENG.e[0].st]})()""")
    assert e[0]=='off' and 16<=e[1]<=17 and e[2]>=500 and e[3]=='run' and e[4]==59 and e[5]=='run' and e[6]=='off' and e[7]=='run',f'engine start/shutdown: {e}'
    m=await pg.evaluate("(()=>{LV.m1=LV.m2=false;lever('master',1);const off=LV.m1;lever('master',1);window.__flight('start');const a=[LV.m1,LV.m2];lever('master',1);const b=LV.m1;window.__flight('reset');return[off,a,b]})()")
    assert m==[True,[True,True],True],f'ENG MASTER ON while the engines run, not switchable in flight: {m}'
    assert r['a']['lineup']==['LINEUP',0] and r['a']['n1']==50,f'lined up, still until the thrust levers move; 50% N1: {r["a"]}'
    assert r['a']['thr']=='LVR' and r['a']['thr2']=='CL','LVR CLB until the thrust levers are set to CL'
    assert 0.35<r['a']['climb']/r['b']['climb']<0.7,f'gear left down: about half the climb: {r["a"]["climb"]} vs {r["b"]["climb"]}'
    assert r['a']['conf']=='1' and r['a']['ias']<=227,f'flaps 1 not retracted: speed held below VFE 230: {r["a"]}'
    assert r['ret'][0]=='OEJN' and r['dt']=='tp,dest',f'immediate return: SEC with NEW DEST OEJN activated in flight, DIR TO OEJN: {r}'
    # ---- CO RTE, ROUTE selection, INIT REQUEST, STORED ROUTES, MCDU MENU (fresh MCDU) ----
    await pg.evaluate("S=freshState();window.__S().msgs=[];render()")
    for ch in 'OEJNOETB2': await P(ch)
    await P('L1');assert await pg.evaluate("[I().from,I().to,I().altn,window.__S().active.via]")==['OEJN','OETB','OEMA','D043O'],'CO RTE OEJNOETB2 loaded'
    await pg.evaluate("S=freshState();window.__S().msgs=[];window.__reqMs(50);render()")
    for ch in 'TRN385': await P(ch)
    await P('L3');await P('R2');await pg.wait_for_timeout(300)
    r=await pg.evaluate("[I().from,I().to,I().ci,I().crz,window.__S().coRte,hasMsg('AOC ACT F-PLN UPLINK'),window.__S().active.legs.filter(l=>l.k==='wpt').length]")
    assert r[:6]==['OEJN','OETB',20,340,'OEJNOETB1',True] and r[6]>15,f'INIT REQUEST: AOC answer fills INIT A and the F-PLN: {r}'
    await pg.evaluate("window.__S().sp=''");await P('DATA');await P('RIGHT');await P('R4')
    for ch in 'MYRTE': await P(ch)
    await P('L5');await pg.evaluate("S=freshState();window.__S().msgs=[];render()")
    for ch in 'MYRTE': await P(ch)
    await P('L1');assert await pg.evaluate("window.__S().active.legs.filter(l=>l.k==='wpt').length")==r[6],'stored route used as CO RTE'
    # NO SID: LAT REV at the origin, DEPARTURE, NO SID: the runway threshold only
    await pg.evaluate("window.__S().sp='';window.__S().fpOff=0");await P('FPLN');await pg.evaluate("window.__S().fpOff=0");await P('L1');await P('L1');await P('R1')
    await P('L1');await P('L2')   # runway list, 16C: the SID list opens
    assert '<NO SID' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')"),'NO SID in the SID list'
    await P('L2');await P('R6');ns=await pg.evaluate("(()=>{const L=window.__S().active.legs;const r=DB.apt.OEJN.rwy['16C'];return[L[0].rwy,L[1].id==='('+Math.round((r.tdze??DB.apt.OEJN.elev)+1500)+')',L[1].aal,L[2].k,L.some(l=>l.seg==='dep'&&l.k==='wpt'),window.__S().active.noSid]})()")
    cd=await pg.evaluate("(()=>{const p=window.__S().active,r=DB.apt.OEJN.rwy['16C'],P=buildPath(p),q=P.pts.find(x=>x.ix===1);return Math.round(gc(r.pos,q.p)-r.len/1852)})()")
    assert cd==3,f'(1500) climb leg drawn 3 NM past the runway end: {cd}'
    assert ns==['16C',True,1500,'disc',False,True],f'NO SID: runway, (elevation+1500) on runway track, then discontinuity: {ns}'
    # ---- Madinah from the charts: STAR + approach via + RNP final, FMA FINAL APP; Tabuk VOR approach; SIDs on every runway ----
    r=await pg.evaluate("""(()=>{const p=newPlan('OEJN','OEMA');setRunway(p,'16C');p.appr='RNP36';p.via='MA428';p.star='BOVE1F';buildArr(p);
      const ids=p.legs.filter(l=>l.seg==='arr'||l.k==='dest').map(l=>l.id).join(' ');
      const S0=S.active;S.active=p;const fl={lat:FL.lat,ver:FL.ver,arm:FL.verArm,la:FL.latArm,st:FL.stage};FL.stage='AIR';FL.lat='LOC';FL.ver='G/S';FL.verArm=[];FL.latArm=null;
      const ap=FCU.ap1;FCU.ap1=true;setFma();const fma=FL.fma.c2&&FL.fma.c2[0]&&FL.fma.c2[0][0];
      Object.assign(FL,{lat:fl.lat,ver:fl.ver,verArm:fl.arm,latArm:fl.la,stage:fl.st});FCU.ap1=ap;S.active=S0;
      return[ids,fma,Object.keys(STARS.OEMA).length,Object.keys(SIDS.OEMA).sort().join(),Object.keys(APPRS.OETB).join()]})()""")
    assert r[0]=='BOVET MA409 MA425 MA401 MA426 MA427 MA428 MUVDA MA510 OEMA',f'STAR BOVE1F + via MA428 + RNP36: {r[0]}'
    assert r[1]=='FINAL APP',f'RNP approach FMA: {r[1]}'
    assert r[2]==32 and r[3]=='17,18,35,36' and r[4]=='ILS24,VOR24,VOR06,VOR13,VOR31,ILS31',f'chart data: {r[2:]}'
    await P('PERF');await P('MENU');assert 'MCDU MENU' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')")
    await P('L1');assert await pg.evaluate("window.__S().page")=='PERFTO','MCDU MENU: FMGC returns to the last FMGC page'
    await pg.evaluate("localStorage.removeItem('airmanship.stored.v1')")
    await pg.click('text=Cockpit 3D');await pg.wait_for_timeout(2500)
    await pg.evaluate('window.__dbg3d.goView(3)');await pg.wait_for_timeout(2500)
    x,y=await pg.evaluate('window.__dbg3d.proj("elec",0.624,0.79)');await pg.mouse.click(x,y);await pg.wait_for_timeout(200)
    assert await pg.evaluate('window.__S().elec.ext'),'EXT PWR tap'
    assert not errs,errs
    print('PASS',url);await pg.close()
async def main():
    urls=sys.argv[1:]
    if not urls: serve();urls=['http://127.0.0.1:8765/index.html','http://127.0.0.1:8765/dist/index.html']
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for u in urls: await run(u,b)
        await b.close()
asyncio.run(main())
