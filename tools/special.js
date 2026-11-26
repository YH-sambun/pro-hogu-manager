// 특별 카드(골든글러브 GG, EX)를 cards.json에 추가. 사용: node tools/special.js data/cards.json data/gg_raw.txt
// GG: KBO 공식 수상 현황(koreabaseball.com/Player/Awards/GoldenGlove.aspx). 스킬 블록 효과 ×1.25(엔진에서 적용)
// EX: 해마다 MVP + MVP를 뺀 최고 OVR 투수 1명 + 최고 OVR 야수 1명. 능력치 +5(상한 120), 코스트 +1(상한 10), 스킬 ×1.25
const fs=require('fs');const [,,cp,gp,ap]=process.argv;const D=JSON.parse(fs.readFileSync(cp));
D.cards=D.cards.filter(c=>!c.v);
const core=fs.readFileSync(__dirname+'/../src/core2.js','utf8');const MVP=new Set(core.match(/const MVP=new Set\('([^']+)'/)[1].split(' '));
const base=D.cards.filter(c=>!c.tx),nm=c=>c.n.replace(/#\d+$/,''),add=[];let miss=[];
const T={넥센:['넥센'],히어로즈:['히어로즈','우리'],SK:['SK'],SSG:['SSG']};
for(const line of fs.readFileSync(gp,'utf8').trim().split('\n')){const [y,...ps]=line.split(';');
  for(const p of ps){const [pos,v]=p.split('=');const tk=v.split(' ');for(let i=0;i+1<tk.length;i+=2){const n=tk[i],t=tk[i+1];if(n==='-')continue;
    let L=base.filter(c=>c.y==+y&&nm(c)===n&&(pos==='P'?c.k==='P':c.k==='B'));if(L.length>1){const m=L.filter(c=>c.t===t);if(m.length)L=m}
    if(!L.length){miss.push(y+' '+n+' '+t);continue}const c=L.sort((a,b)=>b.o-a.o)[0];add.push({...c,v:'GG',gg:pos})}}}
if(ap){const TM={kt:'KT'},AL={유지현:'류지현',나종덕:'나균안',한동민:'한유섬',이승화:'이우민'},seen=new Set();let am=[];for(const line of fs.readFileSync(ap,'utf8').trim().split('\n')){const [y,rest]=line.split(':');
  for(const e of rest.split(',')){let [n,t]=e.split('@');t=TM[t]||t;n=AL[n]||n;const cands=[n,n.replace(/ 주니어$/,''),n.split(' ').pop(),n.split(' ')[0]];let L=[];
    for(const m of cands){L=base.filter(c=>c.y==+y&&nm(c)===m&&c.t===t);if(L.length)break}
    if(!L.length){for(const m of cands){L=base.filter(c=>c.y==+y&&nm(c)===m);if(L.length===1)break;L=[]}}
    if(!L.length){am.push(y+' '+n+' '+t);continue}const c=L.sort((a,b)=>b.o-a.o)[0];const key=c.y+c.t+c.n;if(seen.has(key))continue;seen.add(key);
    add.push({...c,v:'AS',r:c.r.map(v=>Math.min(120,v+3)),o:c.o+2})}}miss=miss.concat(am)}
const years=[...new Set(base.map(c=>c.y))];
// EX(구단 균형안): MVP는 항상 EX. 그 외는 구단(계보)마다 역대 최고 OVR 시즌을 골라 계보당 EXQ장(시즌 수 45 기준 비례, 최소 EXMIN)까지. 한 계보에서 한 시즌은 1장, 같은 선수 여러 시즌 가능.
// 2026-11-24 축소: 계보당 12장(최소 4), MVP 외에는 한 선수 최대 2시즌(같은 선수 독식 방지. 김광현 2시즌·최정 유지). 총 102장
const EXQ=12,EXMIN=4,EXPC=2,ex=new Set();const lines=[...new Set(base.map(c=>c.l))];
{const MB={};for(const c of base){const k=nm(c)+c.y;if(MVP.has(k)&&(!MB[k]||c.o>MB[k].o))MB[k]=c}for(const k in MB)ex.add(MB[k])} // MVP: 이름+연도당 OVR 최고 1장(동명이인 제외)
for(const l of lines){const L=base.filter(c=>c.l===l),seasons=new Set(L.map(c=>c.y)).size,q=Math.max(EXMIN,Math.round(EXQ*seasons/45));
  const X=[...ex].filter(c=>c.l===l),used=new Set(X.map(c=>c.y)),cnt={};X.forEach(c=>cnt[nm(c)]=(cnt[nm(c)]||0)+1);let n=used.size;
  for(const c of L.slice().sort((a,b)=>b.o-a.o)){if(n>=q)break;if(used.has(c.y)||(cnt[nm(c)]||0)>=EXPC)continue;ex.add(c);used.add(c.y);cnt[nm(c)]=(cnt[nm(c)]||0)+1;n++}}
// 2026-11-26(SJ): 소규모 계보 보정 EX 추가(김현욱 97 쌍방울, 장명부 83 삼미)
for(const [n,y,t] of [['김현욱',1997,'쌍방울'],['장명부',1983,'삼미']]){const c=base.filter(c=>nm(c)===n&&c.y===y&&c.t===t).sort((a,b)=>b.o-a.o)[0];if(c)ex.add(c)}
for(const c of ex)add.push({...c,v:'EX',r:c.r.map(v=>Math.min(120,v+5)),o:c.o+4,c:Math.min(10,c.c+1)})
// 신인왕(RY): KBO 역대 신인상(data/ry_raw.txt, 1983~). 능력치 +3(상한 120), OVR +2. 컨디션 하한 보통(엔진 condMin)
{const rp=__dirname+'/../data/ry_raw.txt';if(fs.existsSync(rp))for(const l of fs.readFileSync(rp,'utf8').trim().split('\n')){const [y,r]=l.split(':'),[n,t]=r.split('@');
  let L=base.filter(c=>c.y==+y&&nm(c)===n);if(L.length>1)L=L.filter(c=>c.t===t);if(L.length!==1){miss.push('RY '+l);continue}const c=L[0];
  add.push({...c,v:'RY',r:c.r.map(v=>Math.min(120,v+3)),o:c.o+2})}}
// 철인(IR): 야수는 그해 전 경기 출장(그 연도 타자 최다 경기 수 이상), 투수는 그해 등판 수 상위 3명. 능력치·코스트는 기본 카드와 같고 스킬 블록 효과 ×1.5(엔진)
// 2026-11-24: 철인은 코스트 5·6 카드만(SJ 요청)
const IRC=c=>c.c===5||c.c===6;
for(const y of years){const Y=base.filter(c=>c.y===y),mg=Math.max(...Y.filter(c=>c.k==='B').map(c=>c.s[4]));
  for(const c of Y.filter(c=>c.k==='B'&&c.s[4]>=mg))if(IRC(c))add.push({...c,v:'IR'});
  for(const c of Y.filter(c=>c.k==='P').sort((a,b)=>b.s[7]-a.s[7]||b.o-a.o).slice(0,3))if(IRC(c))add.push({...c,v:'IR'})}
D.cards.push(...add);fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
console.log('RY',add.filter(c=>c.v==='RY').length,'IR',add.filter(c=>c.v==='IR').length,'AS',add.filter(c=>c.v==='AS').length,'GG',add.filter(c=>c.v==='GG').length,'EX',add.filter(c=>c.v==='EX').length,'못 찾음',miss.length,miss.join(', '));
