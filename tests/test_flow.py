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
    await t('160');await k('L1');assert await pg.evaluate('window.__S().msg')=='V1/VR/V2 DISAGREE','V-speed order check'
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
    await pg.evaluate("window.__flight('start')")
    seen=await pg.evaluate("""(()=>{const seen=new Set(),log=[];let n=0,did={};const add=()=>{const f=FL.fma;[f.c1,f.c2,f.c3,f.c4].forEach(c=>(c||[]).forEach(x=>x&&x[0]&&seen.add(x[0])));if(f.land)seen.add(f.land);seen.add('PH:'+S.phase);seen.add('LAT:'+FL.lat);seen.add('VER:'+FL.ver)};
      while(FL.stage!=='STOP'&&n<60000){step(0.5);setFma();add();n++;const dtg=FL.path.sThr-FL.s;
        if(!did.ap&&FL.alt-groundElev()>1200){fcuButton('ap1');did.ap=1}
        if(!did.lvl&&FL.ver==='ALT'&&Math.abs(FL.alt-7000)<30){seen.add('LEVEL7000');FCU.alt=34000;fcuPush('alt',false);did.lvl=1}
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
        if(!did.appr&&dtg<28){fcuButton('appr');fcuButton('ap2');did.appr=1}}
      seen.add('END:'+FL.stage);return[...seen]})()""")
    for m in ['DIR TO INSERTED','PATH FROM T-P','FROM LINE SEQUENCED','QNH ABOVE TA','STD SET','PERF CRZ T/D','CONF1 AT 12NM','CONF2 AT 8NM','MAN','SRS','RWY','NAV','THR CLB','CLB','LEVEL7000','ALT','ALT CRZ','HDG','NAV REJOINED','DES','THR IDLE','LOC *','LOC','G/S*','G/S','CAT 3','DUAL','LAND','FLARE','RETARD','ROLL OUT','PH:CLB','PH:CRZ','PH:DES','PH:APPR','PH:DONE','END:STOP']:
        assert m in seen,f'never seen in the flight: {m}  (seen: {sorted(seen)})'
    await pg.evaluate("window.__flight('reset')")
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
