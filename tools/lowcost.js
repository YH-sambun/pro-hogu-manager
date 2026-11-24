// node tools/lowcost.js data/cards.json : 팀-연도마다 1~3코스트 후보가 모자라면(타자 8명, 투수 5명 미만) 능력이 낮은 순으로 코스트를 3으로 내림
const fs=require('fs'),f=process.argv[2],J=JSON.parse(fs.readFileSync(f));const ty={};
for(const c of J.cards)(ty[c.y+' '+c.t]=ty[c.y+' '+c.t]||[]).push(c);
const val=c=>c.k==='B'?(c.r[0]*.35+c.r[1]*.35+c.r[2]*.2+c.r[4]*.1):(c.r[1]*.35+c.r[2]*.2+c.r[3]*.3+c.r[4]*.15);let ch=0;
for(const L of Object.values(ty))for(const [k,need] of [['B',8],['P',5]]){const g=L.filter(c=>c.k===k&&!c.m),have=g.filter(c=>c.c<=3).length;if(have>=need)continue;
  const cand=g.filter(c=>c.c>3).sort((a,b)=>val(a)-val(b)).slice(0,need-have);for(const c of cand){c.c=3;ch++}}
fs.writeFileSync(f,JSON.stringify(J));console.log('changed',ch)
