// 이 다음에 node tools/hand_fix.js data/cards.json 으로 표기 차이·확실한 선수 보충(2026-11-25)
// 투타 손(좌우) 정보: c.h 한 글자(a 우투우타 b 우투좌타 c 우투양타 d 좌투우타 e 좌투좌타 f 좌투양타). 사용: node tools/hand.js data/cards.json data/hand_kbo.txt data/hand_wiki.txt
// 원자료: KBO 선수 조회의 현역 선수 정보(우투우타 등), 한국어 위키백과 야구 선수 정보 틀(투구/타석). 형식: 이름 + (출생연도 끝 두 자리 + 코드)…, 코드 a=우우 b=우좌 c=우양 d=좌우 e=좌좌 f=좌양
const fs=require('fs');const [cf,...src]=process.argv.slice(2),J=JSON.parse(fs.readFileSync(cf));
const DEC={a:'RR',b:'RL',c:'RS',d:'LR',e:'LL',f:'LS'};const M={};
src.forEach((f,si)=>{const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/(.+?)((?:\d\d[a-f])+)(?: |\n|$)/g)){const full=m[1].trim(),v=[...m[2].matchAll(/(\d\d)([a-f])/g)].map(x=>[+x[1],DEC[x[2]]]);
  const keys=new Set([full,full.replace(/ /g,'')]);const w=full.replace(/ 주니어$/,'').split(' ');if(w.length>1){keys.add(w[w.length-1]);keys.add(w.slice(-2).join(''));keys.add(w[0]+w[w.length-1])} /* 2026-11-25: 밴헤켄(앤디 밴 헤켄)·팻딘(팻 딘) 같은 붙여 쓴 이름도 */
  for(const k of keys){M[k]=M[k]||[];for(const x of v)M[k].push([...x,si,k===full])}}});
let ok=0,no=0,amb=0;
const ENC=Object.fromEntries(Object.entries(DEC).map(([k,v])=>[v,k]));
for(const c of J.cards){delete c.th;delete c.bh;delete c.h;const n=c.n.replace(/#\d+$/,''),L=M[n];if(!L){no++;continue}
  const fy=yy=>2000+yy<=c.y-15?2000+yy:1900+yy;const age=x=>c.y-fy(x[0]),inAge=x=>age(x)>=17&&age(x)<=45;let m=c.b?L.filter(x=>x[0]===c.b%100):L.filter(inAge);
  if(!m.length&&c.b)m=L.filter(x=>x[3]&&Math.abs(x[0]-c.b%100)===1&&inAge(x)); /* 전체 이름이 같을 때만 */ /* 출생연도 1년 차이(자료마다 다름)도 허용 *//* 출생연도 모르면 그해 17~45세 후보만 */const s0=Math.min(...m.map(x=>x[2]));m=m.filter(x=>x[2]===s0);/* 앞 파일(KBO 공식) 우선 */const u=[...new Set(m.map(x=>x[1]))];
  if(u.length===1){c.h=ENC[u[0]];ok++}else if(u.length>1){amb++}else no++}
fs.writeFileSync(cf+'.tmp',JSON.stringify(J));fs.renameSync(cf+'.tmp',cf);
const base=J.cards.filter(c=>!c.v),d=k=>base.filter(c=>c.h&&c.k===k).length;
console.log({ok,amb,no,기본카드:base.length,투수좌우:d('P')+'/'+base.filter(c=>c.k==='P').length,타자좌우:d('B')+'/'+base.filter(c=>c.k==='B').length,
  좌투:base.filter(c=>c.k==='P'&&'def'.includes(c.h||'x')).length,좌타:base.filter(c=>c.k==='B'&&'be'.includes(c.h||'x')).length,양타:base.filter(c=>c.k==='B'&&'cf'.includes(c.h||'x')).length})
