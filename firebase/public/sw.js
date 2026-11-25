// 프로호구 매니저 서비스 워커: 카드 데이터·기본 사진 캐시(미리 받기). 빌드 때 10f16bda7c가 cards.json 해시로 바뀜
// cards.json은 버전(해시)별 캐시: 데이터가 바뀌면 새 버전만 받고 옛 버전 캐시는 지움
// 기본 사진(img/, 위키미디어 공용)은 파일명이 내용 기준이라 캐시 우선. 직접 올린 사진(data: URL)은 건드리지 않음
const VER='10f16bda7c',DATA='phm-data-'+VER,IMG='phm-img';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(DATA).then(c=>c.add('cards.json?v='+VER)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('phm-data-')&&k!==DATA)await caches.delete(k);await self.clients.claim()})()));
async function cacheFirst(n,r,key){const c=await caches.open(n),h=await c.match(key||r);if(h)return h;const res=await fetch(r);if(res.ok||res.type==='opaque')c.put(key||r,res.clone()).catch(()=>{});return res}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin&&u.pathname.endsWith('/cards.json')){e.respondWith(cacheFirst(DATA,r,new URL('cards.json?v='+VER,self.registration.scope).href));return}
  if((u.origin===location.origin&&u.pathname.includes('/img/'))||u.hostname==='commons.wikimedia.org'||u.hostname==='upload.wikimedia.org')e.respondWith(cacheFirst(IMG,r).catch(()=>fetch(r)))});
