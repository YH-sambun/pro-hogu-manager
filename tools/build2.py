# usage: python3 -I tools/build2.py <game_dir>/  [fb]
import sys,os
d=sys.argv[1];fbm=len(sys.argv)>2 and sys.argv[2]=='fb'
s=open(d+'src/shell2.html').read()
ui=open(d+'src/ui2.js').read().replace('/*NOTICES*/',open(d+'src/notices.js').read() if os.path.exists(d+'src/notices.js') else 'const NOTICES=[];').replace('/*MODES*/',open(d+'src/modes.js').read()).replace('/*ONLINE*/',open(d+'src/online.js').read())
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
  # 서비스 워커: fb·v2(GitHub Pages) 둘 다 (홈 화면 앱 설치에 필요)
  open(od+'sw.js','w').write(open(d+'src/sw.js').read().replace('__VER__',h))
  s=s.replace('</body>',"<script>if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{})</script></body>")
# 홈 화면 앱(PWA): 매니페스트·아이콘 복사
import shutil
if os.path.isdir(d+'src/pwa'):
  for f in os.listdir(d+'src/pwa'):shutil.copy(d+'src/pwa/'+f,od+f)
if "const BUILD='__BUILD__'" in s:s=s.replace("const BUILD='__BUILD__'","const BUILD='%s'"%hashlib.md5(s.encode()).hexdigest()[:10])  # 새 버전 확인용
open(out,'w').write(s)
print('wrote',out)
