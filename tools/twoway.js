// 투타 겸업: 같은 해·팀에 같은 선수(출생연도·출신고 일치)의 타자 카드와 투수 카드가 둘 다 있으면,
// 기록이 적은 쪽(코스트·OVR 낮은 쪽)을 '부 포지션' 카드로 표시(tw=1). 코스트는 그 성적대로 계산된 값을 그대로 씀(사용자 결정). 사용: node tools/twoway.js data/cards.json
const fs=require('fs');const [cf]=process.argv.slice(2),J=JSON.parse(fs.readFileSync(cf));const nm=c=>c.n.replace(/#\d+$/,'');
const base=J.cards.filter(c=>!c.v);for(const c of base)delete c.tw;const m={};for(const c of base){const k=c.y+c.t+nm(c);(m[k]=m[k]||[]).push(c)}
let n=0;const out=[];
for(const L of Object.values(m)){const B=L.filter(c=>c.k==='B'),P=L.filter(c=>c.k==='P');if(B.length!==1||P.length!==1)continue;const b=B[0],p=P[0];
  if(!(b.tx||p.tx)&&!b.b||b.b!==p.b||(b.hs||null)!==(p.hs||null))continue; // 동명이인 제외
  const [main,sub]=b.tx?[p,b]:p.tx?[b,p]:(b.c>p.c||(b.c===p.c&&b.o>=p.o))?[b,p]:[p,b];sub.tw=1;if(sub.c0)sub.c=sub.c0;delete sub.c0;
  const big=sub.k==='B'?sub.s[5]>=100:sub.s[6]>=30; // 부 포지션 기록이 충분하면(100타석 / 30이닝 이상) 실제 성적대로, 아니면 코스트 1
  n++;out.push(`${b.y} ${b.t} ${nm(b)} 주:${main.k} 부:${sub.k} ${sub.c}코 (${sub.k==='B'?sub.s[5]+'타석':sub.s[6]+'이닝'})`)}
// convert_tw.js가 만든 확장 부카드(tx)는 항상 부 포지션
for(const c of base)if(c.tx&&!c.tw){c.tw=1;n++}
// 특별 카드(AS/GG/EX)는 기본 카드 복사본이라 겸업 표시도 따라감
for(const c of J.cards)if(c.v){const o=base.find(x=>x.y===c.y&&x.t===c.t&&x.n===c.n&&x.k===c.k);if(o&&o.tw){c.tw=1}}
fs.writeFileSync(cf+'.tmp',JSON.stringify(J));fs.renameSync(cf+'.tmp',cf);console.log('겸업 부 카드',n);console.log(out.join('\n'))
