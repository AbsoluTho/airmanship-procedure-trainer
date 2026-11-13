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
    done=await pg.evaluate("[...document.querySelectorAll('#tasks li.done')].length")
    assert done==9,f'exercise tasks done: {done}/9'
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
