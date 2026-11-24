// node tools/birth.js data/birth_raw.txt data/cards.json → cards에 b(출생연도)·un(출신 대학) 추가
// 원자료: KBO 선수 조회(koreabaseball.com/Player/Search.aspx)의 생년월일·출신교.
// 형식: 줄마다 "이름=후보;후보" , 후보 = yy + P|B + 출신고 + '/' + 대학(없으면 빈칸)
const fs=require('fs');const [raw,cf]=process.argv.slice(2),J=JSON.parse(fs.readFileSync(cf));
const R={};for(const line of fs.readFileSync(raw,'utf8').split('\n')){const i=line.indexOf('=');if(i<0)continue;
  R[line.slice(0,i)]=line.slice(i+1).split(';').filter(Boolean).map(x=>{const [a,un]=x.split('/');return {y:+a.slice(0,2),k:a[2],hs:a.slice(3),un:un||''}})}
const full=y=>y>30?1900+y:2000+y;const first={};for(const c of J.cards){const key=c.n+c.k+c.l;first[key]=Math.min(first[key]||9999,c.y)}
let ok=0,no=0,amb=0;
for(const c of J.cards){const n=c.n.replace(/#\d+$/,''),L0=R[n];delete c.b;delete c.un;if(!L0||!L0.length){no++;continue}
  const fy=first[c.n+c.k+c.l];let L=L0.map(x=>({...x,by:full(x.y)})).filter(x=>c.y-x.by>=17&&c.y-x.by<=46&&fy-x.by>=17&&fy-x.by<=36);
  if(c.hs){const h=L.filter(x=>x.hs&&(x.hs===c.hs||c.hs.startsWith(x.hs)||x.hs.startsWith(c.hs)));if(h.length)L=h}
  const t=L.filter(x=>x.k===c.k);if(t.length)L=t;
  L.sort((p,q)=>Math.abs(c.y-p.by-28)-Math.abs(c.y-q.by-28));
  if(L.length===1||(L.length>1&&(L[0].by===L[1].by||Math.abs(c.y-L[0].by-28)+4<Math.abs(c.y-L[1].by-28)))){c.b=L[0].by;if(L[0].un&&!/^(현대|대학)$/.test(L[0].un))c.un=L[0].un;ok++}else if(L.length)amb++;else no++}
fs.writeFileSync(cf+'.tmp',JSON.stringify(J));fs.renameSync(cf+'.tmp',cf);console.log({ok,amb,no,un:J.cards.filter(c=>c.un).length})
