# usage: python3 -I tools/build2.py <game_dir>/  [fb]
import sys,os
d=sys.argv[1];fbm=len(sys.argv)>2 and sys.argv[2]=='fb'
s=open(d+'src/shell2.html').read()
ui=open(d+'src/ui2.js').read().replace('/*MODES*/',open(d+'src/modes.js').read()).replace('/*ONLINE*/',open(d+'src/online.js').read())
s=s.replace('/*CORE*/',open(d+'src/core2.js').read()).replace('/*ECON*/',open(d+'src/econ.js').read()).replace('/*UI*/',ui)
out=d+'v2/index.html'
if fbm:
  s=s.replace('</body>',open(d+'src/fb-loader.html').read()+'</body>')
  out=d+'firebase/public/index.html';os.makedirs(os.path.dirname(out),exist_ok=True)
import hashlib
od=os.path.dirname(out)+'/'
if os.path.exists(od+'cards.json'):
  h=hashlib.md5(open(od+'cards.json','rb').read()).hexdigest()[:10]
  assert s.count("fetch('cards.json')")==1
  s=s.replace("fetch('cards.json')","fetch('cards.json?v=%s')"%h)
  if fbm:
    open(od+'sw.js','w').write(open(d+'src/sw.js').read().replace('__VER__',h))
    s=s.replace('</body>',"<script>if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{})</script></body>")
open(out,'w').write(s)
print('wrote',out)
