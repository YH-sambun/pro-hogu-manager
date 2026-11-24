// 타자 카드에 x=[타석,타수,안타,2루타,3루타,홈런,볼넷,사구] 추가(KBO 기록실 원자료). 사용: node tools/addx.js data/cards.json data/kbo_raw_1982_2026.json
const fs=require('fs');const D=JSON.parse(fs.readFileSync(process.argv[2]));const raw=JSON.parse(fs.readFileSync(process.argv[3]));
const num=v=>+String(v).replace(/,/g,'')||0;let miss=0,amb=0,ok=0;
for(const c of D.cards){if(c.k!=='B')continue;const n=c.n.replace(/#\d+$/,'');const rows=((raw[c.y]||{})[c.t]||{}).H||[];let m=rows.filter(r=>r[0]===n);
 if(m.length>1){amb++;m=m.filter(r=>num(r[3])===c.s[4]&&num(r[4])===c.s[5])}
 if(!m.length){miss++;continue}const r=m[0].map((x,i)=>i<2?x:num(x));ok++;
 c.x=[r[4],r[5],r[6],r[7],r[8],r[9],r[13],r[14]]} // PA AB H 2B 3B HR BB HBP
console.log({ok,miss,amb});fs.writeFileSync(process.argv[2],JSON.stringify(D));
