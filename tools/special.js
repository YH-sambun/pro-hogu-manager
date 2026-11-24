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
for(const y of years){const Y=base.filter(c=>c.y===y),ex=new Set();
  for(const c of Y)if(MVP.has(nm(c)+y))ex.add(c);const mv=new Set([...ex].map(nm));
  for(const k of ['P','B']){const c=Y.filter(c=>c.k===k&&!mv.has(nm(c))).sort((a,b)=>b.o-a.o)[0];if(c)ex.add(c)}
  for(const c of ex)add.push({...c,v:'EX',r:c.r.map(v=>Math.min(120,v+5)),o:c.o+4,c:Math.min(10,c.c+1)})}
// 철인(IR): 야수는 그해 전 경기 출장(그 연도 타자 최다 경기 수 이상), 투수는 그해 등판 수 상위 3명. 능력치·코스트는 기본 카드와 같고 스킬 블록 효과 ×1.5(엔진)
for(const y of years){const Y=base.filter(c=>c.y===y),mg=Math.max(...Y.filter(c=>c.k==='B').map(c=>c.s[4]));
  for(const c of Y.filter(c=>c.k==='B'&&c.s[4]>=mg))add.push({...c,v:'IR'});
  for(const c of Y.filter(c=>c.k==='P').sort((a,b)=>b.s[7]-a.s[7]||b.o-a.o).slice(0,3))add.push({...c,v:'IR'})}
D.cards.push(...add);fs.writeFileSync(cp+'.tmp',JSON.stringify(D));fs.renameSync(cp+'.tmp',cp);
console.log('IR',add.filter(c=>c.v==='IR').length,'AS',add.filter(c=>c.v==='AS').length,'GG',add.filter(c=>c.v==='GG').length,'EX',add.filter(c=>c.v==='EX').length,'못 찾음',miss.length,miss.join(', '));
