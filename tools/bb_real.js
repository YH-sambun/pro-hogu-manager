// 2026-11-28 타구 성향(gm)·희생타 지수(sm) 카드 반영
// node tools/bb_real.js <cards.json> <out.json> [yagoonara_season_rows.txt]
// sm: 카드 기록(x)의 (타석-타수-볼넷-사구)/타석 = 희생번트+희생플라이 비율 ÷ 그 해 리그 평균, n/(n+200) 축소
// gm: 야구나라(KBO 공식) GO/(GO+AO)의 리그 대비 오즈비, n/(n+150) 축소(로그). 같은 시즌 없으면 ±2년 내 가장 가까운 시즌
const fs=require('fs');const [,,inp,out,srf]=process.argv;const J=JSON.parse(fs.readFileSync(inp));const A=J.cards;
const B=A.filter(c=>c.k==='B'&&c.x);const lg={};
for(const c of B){if(c.v)continue;const [pa,ab,,,,,bb,hbp]=c.x;const s=Math.max(0,pa-ab-bb-hbp);const L=lg[c.y]=lg[c.y]||[0,0];L[0]+=s;L[1]+=pa}
let nsm=0;for(const c of B){const [pa,ab,,,,,bb,hbp]=c.x;const s=Math.max(0,pa-ab-bb-hbp),L=lg[c.y];if(!L||!L[0]||pa<30){delete c.sm;continue}
 const r=(s/pa)/(L[0]/L[1]),w=pa/(pa+200);c.sm=Math.round((1+(r-1)*w)*100)/100;nsm++}
let ngm=0;
if(srf){const R={},LG={};for(const ln of fs.readFileSync(srf,'utf8').split('\n')){const [key,rows]=ln.split('\t');if(!rows||rows==='-')continue;const [n,b2]=key.split('|');
  for(const r of rows.split(' ')){const [yy,pa,sac,sf,gdp,go,ao]=r.split(',');if(go===''||ao==='')continue;const y=2000+ +yy,G=+go,Ao=+ao;if(G+Ao<1)continue;(R[n+'|'+b2]=R[n+'|'+b2]||{})[y]=[G,Ao];const l=LG[y]=LG[y]||[0,0];l[0]+=G;l[1]+=Ao}}
 for(const c of B){const k=c.n.replace(/#\d+/,'')+'|'+String(c.b).slice(2,4),P=R[k];delete c.gm;if(!P)continue;
  let y=c.y;if(!P[y]){const ys=Object.keys(P).map(Number).filter(v=>Math.abs(v-c.y)<=2).sort((a,b)=>Math.abs(a-c.y)-Math.abs(b-c.y));if(!ys.length)continue;y=ys[0]}
  const [G,Ao]=P[y],l=LG[y],n=G+Ao,p=(G+.5)/(n+1),q=l[0]/(l[0]+l[1]),lo=Math.log(p/(1-p)/(q/(1-q)))*n/(n+150);c.gm=Math.round(Math.exp(lo)*100)/100;ngm++}}
fs.writeFileSync(out,JSON.stringify(J));console.log('sm',nsm,'gm',ngm,'of',B.length);
