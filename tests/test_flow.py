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
    # ---- automatic flight ----
    assert await pg.evaluate('flightReady().length')==0,await pg.evaluate('flightReady()')
    await pg.evaluate("window.__flight('start')")
    seen=await pg.evaluate("""(()=>{const seen=new Set();let n=0;while(FL.stage!=='STOP'&&n<40000){step(0.5);setFma();const f=FL.fma;
      [f.c1,f.c2,f.c3].forEach(c=>(c||[]).forEach(x=>x&&seen.add(x[0])));if(f.land)seen.add(f.land);seen.add('PH:'+S.phase);n++}return[...seen]})()""")
    for m in ['MAN','SRS','RWY','NAV','THR CLB','CLB','ALT CRZ','DES','G/S*','G/S','LOC','LAND','FLARE','RETARD','ROLL OUT','PH:CLB','PH:CRZ','PH:DES','PH:APPR','PH:DONE']:
        assert m in seen,f'FMA/phase never shown: {m}'
    await pg.evaluate("window.__flight('reset')")
    done=await pg.evaluate("[...document.querySelectorAll('#tasks li.done')].length")
    assert done==14,f'exercise tasks done: {done}/14'
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
