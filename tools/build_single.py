"""Build dist/index.html: one self-contained file (scripts, styles, fonts and images inlined).
Used to publish the private test page. Run from the repository root: python3 tools/build_single.py"""
import base64,re,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd=lambda p:open(os.path.join(root,p),encoding='utf-8').read()
b64=lambda p:base64.b64encode(open(os.path.join(root,p),'rb').read()).decode()
html=rd('index.html')
css=rd('css/app.css')
css=re.sub(r"url\(\.\./fonts/([^)]+\.woff2)\)",lambda m:"url(data:font/woff2;base64,%s)"%b64('fonts/'+m.group(1)),css)
html=html.replace('<link rel="stylesheet" href="css/app.css">','<style>\n'+css+'</style>')
def inline(m):
    src=rd(m.group(1))
    src=re.sub(r"'(img/[a-z_\-]+\.webp)'",lambda k:"'data:image/webp;base64,%s'"%b64(k.group(1)),src)
    return '<script>\n'+src.replace('</script','<\\/script')+'\n</script>'
html=re.sub(r'<script src="([^"]+)"></script>',inline,html)
os.makedirs(os.path.join(root,'dist'),exist_ok=True)
open(os.path.join(root,'dist/index.html'),'w',encoding='utf-8').write(html)
print('dist/index.html',len(html)//1024,'KB')
