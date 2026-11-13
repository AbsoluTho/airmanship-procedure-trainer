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
    assert await pg.evaluate("msgShown().t")=='GPS PRIMARY','GPS PRIMARY at power-up'
    await k('CLR');assert await pg.evaluate("msgShown()")==None,'CLR clears GPS PRIMARY'
    await t('OEJN/OETB');await k('R1');await t('OEMA');await k('L2');await t('TRN385');await k('L3');await t('20');await k('L5')
    await t('340/46');await k('L6')
    assert await pg.evaluate('window.__S().init.temp')==-46,'unsigned CRZ temp should be negative'
    await t('360');await k('R5');assert await pg.evaluate('window.__S().init.tropo')==36000,'3-digit TROPO'
    await k('FPLN');await k('L1');await k('L1');await k('L2');await k('DOWN');await k('L5');await k('R6')
    legs=await pg.evaluate('window.__S().active.legs.map(l=>l.id||"-")')
    await pg.evaluate(f'window.__S().fpOff={legs.index("MIGDA")}');await k('L1');await k('R5')
    await t('L677');await k('L1');await t('V54');await k('L2');await t('TBK');await k('R2');await k('R6')
    await k('L6');await k('R1');await k('L3');await k('L4');await k('R6')
    legs=await pg.evaluate('window.__S().active.legs.map(l=>l.k)')
    await pg.evaluate(f'window.__S().fpOff={legs.index("disc")-1}');await k('CLR');await k('L2');await k('R6')
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
    await pg.evaluate(f'window.__S().fpOff={legs.index("dest")-1}');await k('UP');await k('DOWN')
    # ---- part 2 pages (FlyByWire layouts) ----
    scr=lambda: pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ').replace(/\\s+/g,' ')")
    await k('INIT');await k('R3');x=await scr();assert 'IRS INIT' in x,('IRS INIT',x,await pg.evaluate('[window.__S().page,window.__S().msg,window.__S().sp]'))
    await k('L6');await k('R4');await t('270/20/FL100');await k('L1');assert await pg.evaluate('window.__S().wind.clb.length')==1,'CLIMB WIND entry'
    await k('R5');assert 'CRZ WIND' in await scr()
    await k('RADNAV');await t('TBK');await k('L1');assert await pg.evaluate('window.__S().rad.vor1.freq')==115.7,'VOR tuned by ident'
    assert 'IPKS' in await scr(),'LS autotuned from the approach'
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
    await k('FUEL');assert 'FUEL PRED' in await scr()
    await k('PROG');assert 'REC MAX' in await scr();await t('OETB');await k('R4');assert '°/' in await scr()
    await k('AIRPORT');await k('INIT');await k('RIGHT')
    done=await pg.evaluate("[...document.querySelectorAll('#tasks li.done')].length")
    assert done==14,f'exercise tasks done: {done}/14'
    alt_rows=await pg.evaluate("fplnRows(window.__S().active).map(r=>r.k).join(',')")
    assert 'altorig,altn' in alt_rows,'alternate F-PLN rows'
    # ---- automatic flight, flown with the FCU ----
    assert 'FCU' in (await pg.evaluate('flightReady().join()')),'FCU altitude required before takeoff'
    await pg.evaluate("window.__FCU.alt=7000;window.__efis('ls')")
    assert await pg.evaluate('flightReady().length')==0,await pg.evaluate('flightReady()')
    # ---- FIX INFO (LAT REV at the origin): ref fix, radial and radius; crossing of the route computed ----
    await pg.evaluate("window.__plan0=clone(window.__S().active);window.__S().fpOff=0");await k('FPLN');await k('L1');await k('R1')
    assert 'FIX INFO' in await pg.evaluate("[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ')"),'FIX INFO page from LAT REV at the origin'
    await t('JDW');await k('L1');await t('90');await k('L2');await t('20');await k('L4')
    fx=await pg.evaluate("(()=>{const f=window.__S().fix[0],h=fixHits(f);return[f.id,f.rad[0],f.radius,h.rad[0]!=null,h.radius!=null]})()")
    assert fx==['JDW',90,20,True,True],f'FIX INFO entries and route crossings: {fx}'
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
    await pg.evaluate("window.__flight('start')")
    seen=await pg.evaluate("""(()=>{const seen=new Set(),log=[];let n=0,did={};const add=()=>{const f=FL.fma;[f.c1,f.c2,f.c3,f.c4].forEach(c=>(c||[]).forEach(x=>x&&x[0]&&seen.add(x[0])));if(f.land)seen.add(f.land);seen.add('PH:'+S.phase);seen.add('LAT:'+FL.lat);seen.add('VER:'+FL.ver)};
      while(FL.stage!=='STOP'&&n<60000){step(0.5);setFma();add();n++;const dtg=FL.path.sThr-FL.s;
        if(n%25===0){drawEcam();seen.add('SD:'+window.__ecam.page())}
        if(!did.sdc&&S.phase==='CRZ'){did.sdc=1;const pg0=window.__EC.page;let ok=true;for(const g of window.SDP_PORTED){window.__EC.page=g;drawEcam();if(document.querySelector('#sdsvg').querySelectorAll('text,line,path').length<3)ok=false}window.__EC.page=pg0;if(ok)seen.add('SD PAGES IN CRZ')}
        if(FL.stage==='ROLL'&&FL.acc>2)seen.add('TREND TAKEOFF');if(FL.stage==='ROLLOUT'&&FL.acc<-2)seen.add('TREND LANDING');
        if(S.phase==='CLB'&&FL.spdIsMach&&FL.alt>25000){seen.add('MACH IN CLB');did.mclb=1}
        if(did.mclb&&S.phase==='DES'&&!FL.spdIsMach&&FL.alt<30000)seen.add('SPEED IN DES');
        if(!did.ap&&FL.alt-groundElev()>1200){fcuButton('ap1');did.ap=1}
        if(!did.lvl&&FL.ver==='ALT'&&Math.abs(FL.alt-7000)<30){seen.add('LEVEL7000');FCU.alt=34000;fcuPush('alt',false);did.lvl=1}
        if(!did.lvl&&FL.ver==='ALT CST'&&Math.abs(FL.alt-7000)<30){seen.add('LEVEL7000');did.lvl=1}
        if(!did.hdg&&FL.alt>20000){FCU.hdgPre=null;fcuPush('hdg',true);FCU.hdg=((Math.round(FL.trkT-3)+30)%360)||360;did.hdg=FL.t}
        if(did.hdg&&!did.nav&&FL.t-did.hdg>90){FCU.hdg=((Math.round(FL.trkT-3)-60+360)%360)||360;fcuPush('hdg',false);did.nav=FL.t}
        if(did.nav&&!did.navok&&FL.lat==='NAV'){seen.add('NAV REJOINED');did.navok=1}
        if(did.navok&&!did.dir&&S.phase==='CRZ'&&FL.fromIx>3){const L=dirList();const tgt=L.find(x=>x.l.id==='WEJ');if(tgt){directTo('WEJ');P.DIR.lsk('R',6);did.dir=1;
          if(S.active.legs.some(l=>l.k==='tp')&&FL.lat==='NAV')seen.add('DIR TO INSERTED')}}
        if(did.dir&&!did.dirok){step(0.5);if(FL.path.pts[0].ix!=null&&S.active.legs[FL.path.pts[0].ix].k==='tp')seen.add('PATH FROM T-P');did.dirok=1}
        if(did.dirok&&!did.seq&&FL.fromIx>0){const r=fplnRows(S.active);if(r[0].ix===FL.fromIx)seen.add('FROM LINE SEQUENCED');did.seq=1}
        if(!did.qnh&&FL.alt>14000){if(EFIS.std===false)seen.add('QNH ABOVE TA');fcuPush('baro',true);if(EFIS.std)seen.add('STD SET');did.qnh=1}
        if(!did.crzpg&&S.phase==='CRZ'){S.page='PERFCRZ';render();const t=[...document.querySelectorAll('#scr .ln')].map(l=>l.textContent).join(' ');if(t.includes('T/D'))seen.add('PERF CRZ T/D');did.crzpg=1}
        if(!did.des&&FL.s>FL.td-40&&S.phase==='CRZ'){FCU.alt=4200;fcuPush('alt',false);did.des=1}
        if(did.des&&!did.q2&&FL.alt<12000){fcuPush('baro',false);did.q2=1}
        if(!did.c1&&FL.conf==='1'&&S.phase==='APPR'){const d=FL.path.sThr-FL.s;if(d<=12.2&&d>11)seen.add('CONF1 AT 12NM');did.c1=1}
        if(!did.c2&&FL.conf==='2'&&S.phase==='APPR'){const d=FL.path.sThr-FL.s;if(d<=8.2&&d>7)seen.add('CONF2 AT 8NM');did.c2=1}
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
        if(!did.d136&&FL.fromIx>=ixOf('D136O')){if(FL.alt<=7000)seen.add('BELOW 7000 AFTER D179O');did.d136=1}
        if(FL.fromIx>=ixOf('D179O'))did.d179=1;
        if(did.d179&&S.phase==='DES'&&FL.spdT<=221)seen.add('SPD CST 220 DES');
        if(!did.lvl6&&FL.ver==='DES'&&Math.abs(FL.vs)<60&&Math.abs(FL.alt-7000)<40)seen.add('DES LEVEL AT CSTR'),did.lvl6=1;
        if(!did.pr&&S.phase==='CLB'&&FL.alt>8000){const v=vPredict(),q=v&&v.wp[ixOf('RIBIL')];if(q&&q.met)seen.add('RIBIL PREDICTED MET');did.pr=1}}
      seen.add('END:'+FL.stage);return[...seen]})()""")
    for m in ['GEAR AT 6NM','CONF3 5S AFTER GEAR','FULL 3S AFTER CONF3','SD PAGES IN CRZ','TREND TAKEOFF','TREND LANDING','MACH IN CLB','SPEED IN DES','SD:eng','SD:crz','SD:wheel','SPD CST 210','ALT CST','ALT CST 7000','CLB AFTER ORPAR','ALT ARMED MAGENTA','RIBIL PREDICTED MET','BELOW 7000 AFTER D179O','SPD CST 220 DES','DES LEVEL AT CSTR','DIR TO INSERTED','PATH FROM T-P','FROM LINE SEQUENCED','QNH ABOVE TA','STD SET','PERF CRZ T/D','CONF1 AT 12NM','CONF2 AT 8NM','MAN','SRS','RWY','NAV','THR CLB','CLB','LEVEL7000','ALT','ALT CRZ','HDG','NAV REJOINED','DES','THR IDLE','LOC *','LOC','G/S*','G/S','CAT 3','DUAL','LAND','FLARE','RETARD','ROLL OUT','PH:CLB','PH:CRZ','PH:DES','PH:APPR','PH:DONE','END:STOP']:
        assert m in seen,f'never seen in the flight: {m}  (seen: {sorted(seen)})'
    await pg.evaluate("window.__flight('reset');window.__ecam.show(false)")
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
    ix=await pg.evaluate("window.__S().active.legs.findIndex(l=>l.id==='LABUN')");await pg.evaluate(f"window.__S().fpOff={ix}");await P('FPLN');await pg.evaluate(f"window.__S().fpOff={ix}")
    await P('L1');await P('L3');assert await pg.evaluate("window.__S().page==='HOLD'&&!!window.__S().tmpy"),'HOLD page with a temporary F-PLN'
    await P('R6');h=await pg.evaluate("(()=>{const L=window.__S().active.legs,i=L.findIndex(l=>l.id==='LABUN');return[L[i+1].k,L[i+1].fix,L[i+1].type]})()")
    assert h==['hold','LABUN','COMPUTED'],f'computed hold inserted after LABUN: {h}'
    r=await pg.evaluate("""(()=>{window.__flight('start');let n=0,ap=0,o={loops:0};while(FL.stage!=='STOP'&&n<40000){step(0.5);n++;if(n%10===0)setFma();
        if(!ap&&FL.alt-groundElev()>1200){fcuButton('ap1');ap=1}if(FL.ver==='ALT'&&FL.alt<8000){FCU.alt=34000;fcuPush('alt',false)}
        if(FL.inHold!=null&&o.t0==null){o.t0=FL.t;o.s=FL.s}
        if(o.t0!=null&&!o.exit){if(FL.s<o.s-1)o.loops++;o.s=FL.s;if(FL.t-o.t0>150&&o.ias==null){o.ias=Math.round(FL.ias);o.hs=holdSpd()}
          if(o.loops>=2){S.page='FPLN';const rows=fplnRows(S.active);S.fpOff=rows.findIndex(r=>r.k==='hold');window.__press('R1');o.exit=FL.holdExit!=null}}
        if(o.exit&&FL.inHold==null&&o.out==null){o.out=S.active.legs[FL.fromIx].k}
        if(o.out&&S.phase==='CRZ'&&S.active.legs[FL.fromIx].k==='wpt')break}
      return o})()""")
    assert r.get('loops',0)>=2 and r.get('exit') and r.get('out')=='hold',f'hold flown twice, IMM EXIT, hold sequenced: {r}'
    assert r.get('ias') and abs(r['ias']-r['hs'])<=8,f'managed speed in the hold is the hold speed: {r}'
    await pg.evaluate("window.__S().sp='';window.__S().fpOff=0");await P('FPLN');await pg.evaluate("window.__S().fpOff=0");await P('L1')
    for ch in 'R10': await P(ch)
    await P('L2');await P('R6');assert await pg.evaluate("JSON.stringify([window.__S().active.ofst.side,window.__S().active.ofst.nm])")=='["R",10]','OFFSET R10 inserted'
    x=await pg.evaluate("""(()=>{const P0=buildPath(Object.assign(clone(S.active),{ofst:undefined}));for(let n=0;n<700;n++)step(0.5);return project(P0,FL.pos,1,P0.pts.length-1).xtk})()""")
    assert 9<x<11,f'aircraft 10 NM right of the route: {x}'
    await pg.evaluate("window.__S().sp='';window.__S().fpOff=0");await P('FPLN');await pg.evaluate("window.__S().fpOff=0");await P('L2')
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
