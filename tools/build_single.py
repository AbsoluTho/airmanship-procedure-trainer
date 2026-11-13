"""Build dist/index.html: one self-contained file (scripts, styles, fonts and images inlined).
Used to publish the private test page. Run from the repository root: python3 tools/build_single.py"""
import base64,re,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd=lambda p:open(os.path.join(root,p),encoding='utf-8').read()
b64=lambda p:base64.b64encode(open(os.path.join(root,p),'rb').read()).decode()
# cache busting: stamp the local scripts and the stylesheet in index.html with a hash of their contents (?v=...),
# so that browsers and the iPad home-screen app load the new files after every change instead of a cached copy
import hashlib
src=rd('index.html')
def stamp(m):
    path=m.group(2);h=hashlib.sha1(open(os.path.join(root,path),'rb').read()).hexdigest()[:8]
    return m.group(1)+path+'?v='+h+m.group(4)
src2=re.sub(r'((?:src|href)=")((?:js|css|vendor)/[^"?]+\.(?:js|css))(\?v=[0-9a-f]+)?(")',stamp,src)
if src2!=src:open(os.path.join(root,'index.html'),'w',encoding='utf-8').write(src2)
html=src2
css=rd('css/app.css')
css=re.sub(r"url\(\.\./fonts/([^)]+\.(woff2|ttf))\)",lambda m:"url(data:font/%s;base64,%s)"%(m.group(2),b64('fonts/'+m.group(1))),css)
html=re.sub(r'<link rel="stylesheet" href="css/app.css(\?v=[0-9a-f]+)?">',lambda m:'<style>\n'+css+'</style>',html)
def inline(m):
    src=rd(m.group(1))
    src=re.sub(r"'(img/[a-z_\-]+\.webp)'",lambda k:"'data:image/webp;base64,%s'"%b64(k.group(1)),src)
    return '<script>\n'+src.replace('</script','<\\/script')+'\n</script>'
html=re.sub(r'<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"></script>',inline,html)
# icons: inline as data URIs; the manifest needs separate files, so the single file leaves it out
html=re.sub(r'<link rel="manifest"[^>]*>\n?','',html)
html=re.sub(r'<link rel="icon" href="favicon.ico" sizes="any">\n?','',html)
html=re.sub(r'href="(icons/[a-z0-9\-]+\.png)"',lambda m:'href="data:image/png;base64,%s"'%b64(m.group(1)),html)
os.makedirs(os.path.join(root,'dist'),exist_ok=True)
open(os.path.join(root,'dist/index.html'),'w',encoding='utf-8').write(html)
print('dist/index.html',len(html)//1024,'KB')
